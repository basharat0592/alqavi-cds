import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from django.contrib.auth import get_user_model
from modules.supplier.models import Supplier
from modules.customer.models import Customer

User = get_user_model()

class MultiTableJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            # print("DEBUG: No Authorization header")
            return None
            
        if not auth_header.startswith('Bearer '):
            print(f"DEBUG: Invalid Auth format: {auth_header[:20]}")
            return None
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, settings.SIMPLE_JWT['SIGNING_KEY'], algorithms=[settings.SIMPLE_JWT['ALGORITHM']])
            user_id_str = str(payload.get('user_id'))
            print(f"DEBUG: Token decoded for user_id: {user_id_str}")
            user = self.get_user(user_id_str)
            if user:
                return (user, token)
            print(f"DEBUG: User not found for ID: {user_id_str}")
            return None
        except jwt.ExpiredSignatureError:
            print("DEBUG: Token Expired")
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            print("DEBUG: Invalid Token")
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            print(f"DEBUG: Auth Error: {str(e)}")
            raise exceptions.AuthenticationFailed(str(e))

    def get_user(self, user_id_str):
        # 1. Standard User
        if user_id_str.isdigit():
            user = User.objects.filter(id=int(user_id_str)).first()
            if user:
                if not user.is_active:
                    raise exceptions.AuthenticationFailed('User account is inactive.')
                return user

        # 2. Supplier (prefixed with sup_)
        if user_id_str.startswith('sup_'):
            try:
                raw_id = user_id_str.split('_')[1]
                supplier = Supplier.objects.filter(id=raw_id).first()
                if supplier:
                    if not supplier.is_active:
                        raise exceptions.AuthenticationFailed('Supplier account is inactive.')
                    
                    # Create Shadow User but WITH A PRIMARY KEY
                    # This PK matches the Supplier ID so DRF recognizes it as authenticated
                    shadow = User(
                        id=supplier.id, 
                        username=supplier.username or supplier.email.split('@')[0],
                        email=supplier.email,
                        is_staff=False,
                        is_active=True
                    )
                    shadow.is_supplier = True
                    shadow.real_id = supplier.id
                    print(f"DEBUG: Authenticated Shadow Supplier: {shadow.username}, pk: {shadow.pk}")
                    return shadow
            except Exception as e:
                print(f"DEBUG: Error in Supplier auth: {str(e)}")
                pass

        # 3. Customer (prefixed with cus_)
        if user_id_str.startswith('cus_'):
            try:
                raw_id = user_id_str.split('_')[1]
                customer = Customer.objects.filter(id=raw_id).first()
                if customer:
                    if not customer.is_active:
                        raise exceptions.AuthenticationFailed('Customer account is inactive.')
                    
                    shadow = User(
                        id=customer.id,
                        username=customer.username or customer.email.split('@')[0],
                        email=customer.email,
                        is_staff=False,
                        is_active=True
                    )
                    shadow.is_customer = True
                    shadow.real_id = customer.id
                    print(f"DEBUG: Authenticated Shadow Customer: {shadow.username}, pk: {shadow.pk}")
                    return shadow
            except Exception as e:
                print(f"DEBUG: Error in Customer auth: {str(e)}")
                pass

        return None
