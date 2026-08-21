"""Organization onboarding — the SaaS invite flow.

The Super Admin creates an organization by naming it and naming who will run
it. That immediately creates the Warehouse (organization) row plus a pending
``OrganizationInvite``; it does NOT create the Admin account. The Super Admin
copies the returned link and sends it however they like.

The invitee opens the link, sets a username/password and fills in their
organization's details, and only then is the Admin user created — assigned to
that organization and signed straight in.

Why the account is not created up front: an Admin row that exists before anyone
has accepted is a live account with a password the Super Admin chose, sitting
in the users list, loginable. Creating it at accept time means an unaccepted or
revoked invite has no account behind it at all.
"""

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from core.scoping import is_platform_operator, tenant_id_for
from modules.company.models import Area
from modules.inventory.models import Warehouse

from .models import OrganizationInvite, Role, User, UserActivityLog
from .serializers import build_user_payload


# ── helpers ──────────────────────────────────────────────────────────────────

def _invite_brief(inv):
    """Invite as the Super Admin's Organizations table sees it."""
    return {
        'id': inv.id,
        'warehouse': str(inv.warehouse_id),
        'organization_name': inv.warehouse.name if inv.warehouse_id else '',
        'admin_name': inv.admin_name,
        'email': inv.email,
        'phone': inv.phone,
        'state': inv.state,
        'created_at': inv.created_at,
        'expires_at': inv.expires_at,
        'accepted_at': inv.accepted_at,
        'accepted_user': str(inv.accepted_user_id) if inv.accepted_user_id else None,
        # The token only travels while the invite can still be used. Returning it
        # for an accepted/revoked invite would put a dead credential in the UI
        # and in logs for no reason.
        'token': inv.token if inv.is_usable else None,
        'path': f'/onboard/{inv.token}' if inv.is_usable else None,
    }


def _require_platform_operator(request):
    if not is_platform_operator(request.user):
        return Response({'error': 'Only the Super Admin can manage organization invites.'},
                        status=status.HTTP_403_FORBIDDEN)
    return None


def _admin_role():
    role, _ = Role.objects.get_or_create(
        name='Admin',
        defaults={'description': 'System administrator with full access'},
    )
    return role


def _unique_username(base):
    """A username derived from the email local-part, suffixed until free."""
    base = ''.join(ch for ch in (base or '').strip().lower() if ch.isalnum() or ch in '._-') or 'admin'
    candidate, n = base, 1
    while User.objects.filter(username__iexact=candidate).exists():
        n += 1
        candidate = f'{base}{n}'
    return candidate


# ── Super Admin: create / list / regenerate / revoke ──────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def org_invites(request):
    denied = _require_platform_operator(request)
    if denied:
        return denied

    if request.method == 'GET':
        qs = OrganizationInvite.objects.select_related('warehouse').all()
        wh = request.query_params.get('warehouse')
        if wh:
            qs = qs.filter(warehouse_id=wh)
        return Response([_invite_brief(i) for i in qs])

    data = request.data
    org_name = (data.get('organization_name') or data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    admin_name = (data.get('admin_name') or '').strip()
    phone = (data.get('phone') or '').strip()
    address = (data.get('address') or '').strip()
    area_id = data.get('area') or None

    errors = {}
    if not org_name:
        errors['organization_name'] = ['Organization name is required.']
    if not email:
        errors['email'] = ['Admin email is required.']
    elif User.objects.filter(email__iexact=email).exists():
        errors['email'] = ['A user with this email already exists.']
    elif OrganizationInvite.objects.filter(
            email__iexact=email, accepted_at__isnull=True, revoked_at__isnull=True,
            expires_at__gt=timezone.now()).exists():
        # Two live invites to one address would race: whichever is accepted second
        # fails on the duplicate email, after the person has filled the form.
        errors['email'] = ['An invite for this email is already pending.']
    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    area = Area.objects.filter(id=area_id).first() if area_id else None

    try:
        with transaction.atomic():
            warehouse = Warehouse.objects.create(
                name=org_name,
                location=address or org_name,
                area=area,
                is_active=True,
            )
            invite = OrganizationInvite.objects.create(
                token=OrganizationInvite.new_token(),
                warehouse=warehouse,
                admin_name=admin_name,
                email=email,
                phone=phone,
                created_by=request.user if request.user.is_authenticated else None,
                expires_at=OrganizationInvite.default_expiry(),
            )
    except IntegrityError:
        return Response({'error': 'Could not create the organization. Please try again.'},
                        status=status.HTTP_400_BAD_REQUEST)

    UserActivityLog.objects.create(
        user=request.user,
        action='create',
        description=f'Created organization "{org_name}" and invited {email} to run it',
        tenant_id=tenant_id_for(request.user),
    )
    return Response(_invite_brief(invite), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def regenerate_invite(request, invite_id):
    """Issue a fresh token and window. Invalidates the previous link, which is
    the point — used after a link expires or is sent to the wrong person."""
    denied = _require_platform_operator(request)
    if denied:
        return denied

    invite = OrganizationInvite.objects.select_related('warehouse').filter(id=invite_id).first()
    if not invite:
        return Response({'error': 'Invite not found.'}, status=status.HTTP_404_NOT_FOUND)
    if invite.accepted_at:
        return Response({'error': 'This invite has already been accepted.'},
                        status=status.HTTP_400_BAD_REQUEST)

    invite.token = OrganizationInvite.new_token()
    invite.expires_at = OrganizationInvite.default_expiry()
    invite.revoked_at = None
    invite.save(update_fields=['token', 'expires_at', 'revoked_at'])

    UserActivityLog.objects.create(
        user=request.user, action='update',
        description=f'Regenerated the invite link for {invite.email}',
        tenant_id=tenant_id_for(request.user),
    )
    return Response(_invite_brief(invite))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def revoke_invite(request, invite_id):
    denied = _require_platform_operator(request)
    if denied:
        return denied

    invite = OrganizationInvite.objects.select_related('warehouse').filter(id=invite_id).first()
    if not invite:
        return Response({'error': 'Invite not found.'}, status=status.HTTP_404_NOT_FOUND)
    if invite.accepted_at:
        return Response({'error': 'This invite has already been accepted.'},
                        status=status.HTTP_400_BAD_REQUEST)

    invite.revoked_at = timezone.now()
    invite.save(update_fields=['revoked_at'])

    UserActivityLog.objects.create(
        user=request.user, action='update',
        description=f'Revoked the invite link for {invite.email}',
        tenant_id=tenant_id_for(request.user),
    )
    return Response(_invite_brief(invite))


# ── Public: the invitee's onboarding page ────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def onboard_preview(request, token):
    """What the onboarding page needs to render, before anyone is signed in.

    Deliberately narrow: the organization name, who it was addressed to, and the
    city list for the address field. No user ids, no other organizations —
    whoever holds the link is not authenticated and may not be the invitee.
    """
    invite = OrganizationInvite.objects.select_related('warehouse').filter(token=token).first()
    if not invite:
        return Response({'error': 'invalid', 'detail': 'This invite link is not valid.'},
                        status=status.HTTP_404_NOT_FOUND)
    if not invite.is_usable:
        return Response({'error': invite.state, 'detail': {
            'accepted': 'This invite has already been used.',
            'revoked': 'This invite has been cancelled.',
            'expired': 'This invite link has expired.',
        }.get(invite.state, 'This invite link is not valid.')}, status=status.HTTP_410_GONE)

    return Response({
        'organization_name': invite.warehouse.name,
        'admin_name': invite.admin_name,
        'email': invite.email,
        'phone': invite.phone,
        'address': invite.warehouse.location or '',
        'area': invite.warehouse.area_id,
        'expires_at': invite.expires_at,
        # Only the shared/global city list. Areas carry a tenant, and this
        # endpoint is public, so listing every area would read one tenant's
        # territory names out to anyone holding any invite link.
        'areas': [
            {'id': a.id, 'name': a.name}
            for a in Area.objects.filter(is_active=True, tenant__isnull=True).order_by('name')
        ],
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def onboard_accept(request, token):
    """Create the Admin, attach them to their organization, sign them in."""
    invite = OrganizationInvite.objects.select_related('warehouse').filter(token=token).first()
    if not invite:
        return Response({'error': 'This invite link is not valid.'}, status=status.HTTP_404_NOT_FOUND)
    if not invite.is_usable:
        return Response({'error': 'This invite link is no longer usable.'}, status=status.HTTP_410_GONE)

    data = request.data
    password = data.get('password') or ''
    confirm = data.get('confirm_password')
    full_name = (data.get('full_name') or invite.admin_name or '').strip()
    username = (data.get('username') or '').strip()
    phone = (data.get('phone') or invite.phone or '').strip()
    address = (data.get('address') or '').strip()
    area_id = data.get('area') or None

    errors = {}
    if len(password) < 8:
        errors['password'] = ['Password must be at least 8 characters.']
    if confirm is not None and confirm != password:
        errors['confirm_password'] = ['Passwords do not match.']
    if username and User.objects.filter(username__iexact=username).exists():
        errors['username'] = ['That username is taken.']
    # The invite was issued to this address; if an account appeared for it in the
    # meantime, accepting would collide.
    if User.objects.filter(email__iexact=invite.email).exists():
        errors['email'] = ['An account already exists for this email.']
    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    if not username:
        username = _unique_username(invite.email.split('@')[0])

    first, _, last = full_name.partition(' ')

    try:
        with transaction.atomic():
            # Lock the invite row for the length of the write so two submissions
            # of the same link cannot both pass the is_usable check above and
            # create two Admins for one organization.
            locked = OrganizationInvite.objects.select_for_update().get(pk=invite.pk)
            if not locked.is_usable:
                return Response({'error': 'This invite link is no longer usable.'},
                                status=status.HTTP_410_GONE)

            user = User.objects.create_user(
                username=username,
                email=locked.email,
                password=password,
                first_name=first,
                last_name=last,
            )
            user.phone = phone
            user.address = address
            user.role = _admin_role()
            user.is_staff = True
            user.status = 'active'
            # tenant stays NULL: an Admin owns their own tenant, and
            # core.scoping.tenant_id_for resolves that to their own pk.
            user.save()
            user.warehouses.add(locked.warehouse)

            warehouse = locked.warehouse
            wh_updates = []
            # The organization name is the Super Admin's to set, so it is not
            # editable here; address and city are the new admin's own details.
            if address and warehouse.location != address:
                warehouse.location = address
                wh_updates.append('location')
            if area_id:
                # Same restriction as the preview: only a city that was actually
                # offered can be selected.
                area = Area.objects.filter(id=area_id, tenant__isnull=True).first()
                if area and warehouse.area_id != area.id:
                    warehouse.area = area
                    wh_updates.append('area')
            # Stamp the organization to its new owner so tenant scoping applies.
            if warehouse.tenant_id != user.id:
                warehouse.tenant = user
                wh_updates.append('tenant')
            if wh_updates:
                warehouse.save(update_fields=wh_updates)

            locked.accepted_at = timezone.now()
            locked.accepted_user = user
            locked.save(update_fields=['accepted_at', 'accepted_user'])
    except IntegrityError:
        return Response({'error': 'Could not complete setup. Please try again.'},
                        status=status.HTTP_400_BAD_REQUEST)

    UserActivityLog.objects.create(
        user=user, action='create',
        description=f'{user.get_full_name() or user.username} set up the organization "{warehouse.name}"',
        tenant_id=tenant_id_for(user),
    )

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': build_user_payload(user),
        'organization_name': warehouse.name,
    }, status=status.HTTP_201_CREATED)
