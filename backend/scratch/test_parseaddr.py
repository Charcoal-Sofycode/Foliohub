
from email.utils import parseaddr

def test(email_str):
    name, addr = parseaddr(email_str)
    print(f"Input: {repr(email_str)}")
    print(f"Name:  {repr(name)}")
    print(f"Addr:  {repr(addr)}")
    print("-" * 20)

test('FolioHub From Sofycode <noreply@sofycode.com>')
test('"FolioHub From Sofycode <noreply@sofycode.com>"')
test('"FolioHub From Sofycode" <noreply@sofycode.com>')
