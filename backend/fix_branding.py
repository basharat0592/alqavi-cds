import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.cms.models import SiteSettings
from django.conf import settings

def fix_branding():
    try:
        s = SiteSettings.objects.get(id=1)
        fields = ['logo', 'favicon', 'footer_logo', 'og_image']
        print(f"Checking settings ID 1...")
        
        for f in fields:
            val = getattr(s, f)
            if not val or not val.name:
                print(f"  - {f}: empty")
                continue
            
            current_name = os.path.basename(val.name)
            print(f"  - {f}: current='{val.name}', basename='{current_name}'")
            
            found = False
            for root, dirs, files in os.walk(settings.MEDIA_ROOT):
                if current_name in files:
                    new_rel_path = os.path.relpath(os.path.join(root, current_name), settings.MEDIA_ROOT).replace('\\', '/')
                    setattr(s, f, new_rel_path)
                    print(f"    => FIXED to: {new_rel_path}")
                    found = True
                    break
            if not found:
                print(f"    !! Could not find file '{current_name}' in media root")
        
        s.save()
        print("Settings saved successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_branding()
