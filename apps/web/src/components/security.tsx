"use client"

import { changePassword, getSession, linkSocial, listAccounts, listSessions, passkey, revokeOtherSessions, revokeSession, unlinkAccount } from "@avenire/auth/client"
import { GoogleIcon, GithubIcon } from "@avenire/auth/components/icons"
import { getBrowser, parseUserAgent } from "@avenire/auth/parse-user-agent"
import { Badge } from "@avenire/ui/src/components/badge"
import { Button } from "@avenire/ui/src/components/button"
import { Card, CardContent } from "@avenire/ui/src/components/card"
import { Label } from "@avenire/ui/src/components/label"
import { Separator } from "@avenire/ui/src/components/separator"
import { Input } from "@avenire/ui/components/input"
import { KeyRoundIcon, SmartphoneIcon, KeyIcon, Fingerprint, ShieldIcon, ShieldAlertIcon, LogOutIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Passkey, Account, Session } from "@avenire/auth/types"

const formatDate = (date: Date) => {
  try {
    return format(date, "MMM d, yyyy")
  } catch (error) {
    return date.toDateString()
  }
}

// Rename the Account interface to avoid conflict
interface ConnectedAccount {
  id: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
  accountId: string;
  scopes: string[];
}

// Reusable component for rendering account
const AccountCard: React.FC<{ account: ConnectedAccount, unlinkAccount: () => void }> = ({ account, unlinkAccount }) => (
  <div
    key={account.id}
    className="flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary hover:bg-muted/30"
  >
    <div className="flex items-center space-x-4">
      {account.provider === "google" ? <GoogleIcon /> : <GithubIcon />}
      <div className="space-y-0.5">
        <p className="font-medium">{account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}</p>
        <p className="text-xs text-muted-foreground">Connected on {formatDate(account.createdAt)}</p>
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <Badge
        variant="outline"
        className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
      >
        Connected
      </Badge>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => unlinkAccount()}
      >
        Disconnect
      </Button>
    </div>
  </div>
);

// Reusable component for rendering not connected account
const NotConnectedCard: React.FC<{ provider: 'google' | 'github' }> = ({ provider }) => (
  <div className="flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary hover:bg-muted/30">
    <div className="flex items-center space-x-4">
      {provider === "google" ? <GoogleIcon /> : <GithubIcon />}
      <div>
        <p className="font-medium">{provider === "google" ? "Google" : "GitHub"}</p>
        <p className="text-sm text-muted-foreground">Not connected</p>
      </div>
    </div>
    <Button variant="outline" size="sm" className="transition-all hover:bg-primary/5" onClick={() => {
      linkSocial({
        provider,
        callbackURL: "/settings/security"
      })
    }}>
      Connect
    </Button>
  </div>
);

export const SecuritySettings = () => {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null)
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [accounts, setAccounts] = useState<ConnectedAccount[] | null>(null)
  const [currentSession, setCurrentSession] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [currentPass, setCurrentPass] = useState<string>("")
  const [newPass, setNewPass] = useState<string>("")
  const [newPassConf, setNewPassConf] = useState<string>("")

  const updateAccounts = async () => {
    const { data } = await listAccounts()
    setAccounts(data?.filter((d) => d.provider !== "credential") || [])
  }
  const updatePasskey = async () => {
    const { data } = await passkey.listUserPasskeys()
    setPasskeys(data)
  }
  const updateSession = async () => {
    const { data } = await listSessions()
    setSessions(data)
  }
  const updateCurrentSession = async () => {
    const { data } = await getSession()
    setCurrentSession(data?.session.token || "")
  }

  useEffect(() => {
    updatePasskey();
    updateSession();
    updateAccounts()
    updateCurrentSession()
  }, [])

  return (
    <div className="container py-6 fade-in px-2">
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Settings</h1>
          <p className="text-muted-foreground">Manage your account security, connected accounts, and devices.</p>
        </div>
        {/* Passkeys Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Passkeys</h2>
          </div>
          <Card className="overflow-hidden shadow-md transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {passkeys && passkeys.length > 0 ? (
                  passkeys.map((pk) => (
                    <div
                      key={pk.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary hover:bg-muted/30"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-primary/10 p-2">
                          {pk.deviceType === "singleDevice" ? (
                            <SmartphoneIcon className="h-5 w-5 text-primary" />
                          ) : (
                            <KeyIcon className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{pk.name}</p>
                            <Badge
                              variant="outline"
                              className={
                                pk.backedUp
                                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                              }
                            >
                              {pk.backedUp ? "Backed up" : "Not backed up"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Added on {formatDate(pk.createdAt)}</p>
                          <p className="text-xs text-muted-foreground">
                            {pk.deviceType === "multiDevice" ? "Multi-device" : "Single device"} •
                            {pk.transports?.split(",").map((t) => ` ${t}`).join(",")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          await passkey.deletePasskey({
                            id: pk.id
                          })
                          updatePasskey()
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Fingerprint className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-1 text-lg font-medium">No passkeys registered</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Passkeys provide a more secure and convenient way to sign in without passwords.
                    </p>
                  </div>
                )}
              </div>

              <Button className="mt-4 transition-all" onClick={async () => {
                await passkey.addPasskey({
                  name: parseUserAgent(navigator.userAgent)
                })
                updatePasskey()
              }}>
                <KeyIcon className="mr-2 h-4 w-4" />
                Add new passkey
              </Button>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Connected Accounts Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlertIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Connected Accounts</h2>
          </div>
          <Card className="overflow-hidden shadow-md transition-all hover:shadow-lg">
            <CardContent className="pt-6 space-y-4">
              {accounts && accounts.map((account: ConnectedAccount) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  unlinkAccount={async () => {
                    await unlinkAccount({ providerId: account.provider });
                    updateAccounts();
                  }}
                />
              ))}

              {/* Add more providers that aren't connected */}
              {accounts && !accounts.some((account) => account.provider === "github") && (
                <NotConnectedCard provider="github" />
              )}

              {accounts && !accounts.some((account) => account.provider === "google") && (
                <NotConnectedCard provider="google" />
              )}
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Active Sessions Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <LogOutIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Active Sessions</h2>
          </div>
          <Card className="overflow-hidden shadow-md transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {sessions && sessions.map((session) => (
                  <div
                    key={session.token}
                    className={`flex items-center justify-between rounded-lg border p-4 ${session.token === currentSession
                      ? "bg-primary/5 transition-all hover:bg-primary/10"
                      : "transition-all hover:border-primary hover:bg-muted/30"
                      }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium">{getBrowser(session.userAgent || "")}</p>
                          {session.token === currentSession && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 ml-2"
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Last active: {session.token === currentSession ? "This device" : formatDate(session.updatedAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {parseUserAgent(session.userAgent || "")} • IP: {session.ipAddress?.substring(0, 10)}...
                        </p>
                      </div>
                    </div>
                    {session.token !== currentSession && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          await revokeSession({
                            token: session.token
                          })
                          updateSession()
                        }}
                      >
                        Sign out
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button variant="destructive" className="mt-4 w-full" onClick={async () => {
                await revokeOtherSessions()
                updateSession()
              }}>
                Sign out from all other devices
              </Button>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Password Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Password</h2>
          </div>
          <Card className="overflow-hidden shadow-md transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (newPass === newPassConf) {
                  setIsLoading(true)
                  await changePassword({
                    currentPassword: currentPass,
                    newPassword: newPass
                  })
                  setIsLoading(false)
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current">Current Password</Label>
                  <Input
                    id="current"
                    type="password"
                    required
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new">New Password</Label>
                  <Input
                    id="new"
                    type="password"
                    required
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    required
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                    value={newPassConf}
                    onChange={(e) => setNewPassConf(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="transition-all">
                  {isLoading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
        <Separator />
      </div>
    </div>
  )
}
