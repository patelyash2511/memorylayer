# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

from rec0 import Memory

mem = Memory(
    api_key="r0_dev_key_2026",
    user_id="sdk_test_user",
    base_url="https://memorylayer-production.up.railway.app"
)

mem.store("The user loves building developer tools and hates meetings")
context = mem.context("what does the user like")
print(context)

mem.delete_user()
print("SDK working. rec0 is ready to ship.")