class DebugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print(f"DEBUG: Request {request.method} {request.path} from {request.META.get('REMOTE_ADDR')}")
        print(f"DEBUG: Headers: {request.headers}")
        response = self.get_response(request)
        print(f"DEBUG: Response Status: {response.status_code}")
        return response
