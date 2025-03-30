"use client"

import { ChangePasswordForm } from "@avenire/auth/components/change-password"

export default function ChangePasswordPage() {
  return (
    <div className="flex flex-1 min-h-screen items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <ChangePasswordForm />
      </div>
    </div>
  )
}

