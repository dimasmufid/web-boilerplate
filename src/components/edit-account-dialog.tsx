"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient } from "@/lib/auth-client"

type EditAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: {
    user?: {
      name?: string | null
      image?: string | null
    } | null
  } | null
  isPending: boolean
  refetch: () => Promise<unknown>
}

export function EditAccountDialog({
  open,
  onOpenChange,
  session,
  isPending,
  refetch,
}: EditAccountDialogProps) {
  const [name, setName] = React.useState("")
  const [imagePreview, setImagePreview] = React.useState<string | null>(
    null
  )
  const [nameStatus, setNameStatus] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [imageStatus, setImageStatus] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [passwordStatus, setPasswordStatus] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [nameMessage, setNameMessage] = React.useState<string | null>(
    null
  )
  const [imageMessage, setImageMessage] = React.useState<string | null>(
    null
  )
  const [passwordMessage, setPasswordMessage] = React.useState<
    string | null
  >(null)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] =
    React.useState(false)
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState<string | null>(
    null
  )
  const nameRef = React.useRef("")
  const imageRef = React.useRef<string | null>(null)
  const imageInputRef = React.useRef<HTMLInputElement | null>(null)
  const statusTimers = React.useRef<Record<string, number>>({})

  React.useEffect(() => {
    if (!open) return
    const nextName = session?.user?.name ?? ""
    const nextImage = session?.user?.image ?? null
    setName(nextName)
    setImagePreview(nextImage)
    nameRef.current = nextName
    imageRef.current = nextImage
    setNameStatus("idle")
    setImageStatus("idle")
    setPasswordStatus("idle")
    setNameMessage(null)
    setImageMessage(null)
    setPasswordMessage(null)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordError(null)
  }, [open, session?.user?.image, session?.user?.name])

  React.useEffect(() => {
    if (!isPasswordDialogOpen) {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordError(null)
    }
  }, [isPasswordDialogOpen])

  const setTransientStatus = (
    key: string,
    setStatus: React.Dispatch<
      React.SetStateAction<"idle" | "saving" | "saved" | "error">
    >,
    setMessage: React.Dispatch<React.SetStateAction<string | null>>,
    message: string
  ) => {
    if (statusTimers.current[key]) {
      window.clearTimeout(statusTimers.current[key])
    }
    setStatus("saved")
    setMessage(message)
    statusTimers.current[key] = window.setTimeout(() => {
      setStatus("idle")
      setMessage(null)
    }, 2200)
  }

  const getInitials = (value: string) => {
    return value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("")
  }

  const handleNameBlur = async () => {
    if (!session?.user) return
    if (nameStatus === "saving") return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setName(nameRef.current)
      setNameStatus("error")
      setNameMessage("Name cannot be empty.")
      return
    }
    if (trimmedName === nameRef.current) return

    const previousName = nameRef.current
    setNameStatus("saving")
    setNameMessage("Saving...")
    nameRef.current = trimmedName

    try {
      const { error } = await authClient.updateUser({
        name: trimmedName,
      })
      if (error) throw error
      await refetch()
      setTransientStatus(
        "name",
        setNameStatus,
        setNameMessage,
        "Saved."
      )
    } catch (error) {
      nameRef.current = previousName
      setName(previousName)
      setNameStatus("error")
      setNameMessage(
        error instanceof Error ? error.message : "Update failed."
      )
    }
  }

  const saveImage = async (nextImage: string | null) => {
    if (!session?.user) return
    if (imageStatus === "saving") return
    if (nextImage === imageRef.current) return

    const previousImage = imageRef.current
    setImageStatus("saving")
    setImageMessage("Saving...")
    imageRef.current = nextImage

    try {
      const { error } = await authClient.updateUser({
        image: nextImage ?? null,
      })
      if (error) throw error
      await refetch()
      setTransientStatus(
        "image",
        setImageStatus,
        setImageMessage,
        "Saved."
      )
    } catch (error) {
      imageRef.current = previousImage
      setImagePreview(previousImage)
      setImageStatus("error")
      setImageMessage(
        error instanceof Error ? error.message : "Update failed."
      )
    }
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result =
        typeof reader.result === "string" ? reader.result : null
      setImagePreview(result)
      void saveImage(result)
    }
    reader.onerror = () => {
      setImageStatus("error")
      setImageMessage("Failed to read the selected image.")
    }
    reader.readAsDataURL(file)
  }

  const handlePasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    if (!session?.user) return
    if (passwordStatus === "saving") return

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Fill out all password fields.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.")
      return
    }

    setPasswordStatus("saving")
    setPasswordMessage("Saving...")
    setPasswordError(null)

    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      })
      if (error) throw error
      setIsPasswordDialogOpen(false)
      setTransientStatus(
        "password",
        setPasswordStatus,
        setPasswordMessage,
        "Password updated."
      )
    } catch (error) {
      setPasswordStatus("error")
      setPasswordMessage(
        error instanceof Error ? error.message : "Update failed."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your name, password, or image.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6">
          <div className="rounded-lg border bg-background">
            <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Profile picture
                </Label>
                <p className="text-xs text-muted-foreground">
                  Upload a square image for best results.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Avatar className="size-12">
                  <AvatarImage
                    src={imagePreview ?? undefined}
                    alt={name || "Profile picture"}
                  />
                  <AvatarFallback>
                    {getInitials(name || "User")}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={isPending || imageStatus === "saving"}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isPending || imageStatus === "saving"}
                >
                  Upload image
                </Button>
              </div>
            </div>
            {imageMessage ? (
              <p className="px-4 pb-4 text-xs text-muted-foreground">
                {imageStatus === "error" ? (
                  <span className="text-destructive">{imageMessage}</span>
                ) : (
                  imageMessage
                )}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label htmlFor="nav-user-name">Full name</Label>
                <p className="text-xs text-muted-foreground">
                  Visible to your workspace.
                </p>
              </div>
              <Input
                id="nav-user-name"
                autoComplete="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (nameStatus !== "idle") {
                    setNameStatus("idle")
                    setNameMessage(null)
                  }
                }}
                onBlur={handleNameBlur}
                placeholder="Your name"
                disabled={isPending || nameStatus === "saving"}
                className="sm:max-w-sm"
              />
            </div>
            {nameMessage ? (
              <p className="px-4 pb-4 text-xs text-muted-foreground">
                {nameStatus === "error" ? (
                  <span className="text-destructive">{nameMessage}</span>
                ) : (
                  nameMessage
                )}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border bg-background">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label>Password</Label>
                <p className="text-xs text-muted-foreground">
                  Update your password with confirmation.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(true)}
                disabled={isPending}
              >
                Change password
              </Button>
            </div>
            {passwordMessage ? (
              <p className="px-4 pb-4 text-xs text-muted-foreground">
                {passwordStatus === "error" ? (
                  <span className="text-destructive">
                    {passwordMessage}
                  </span>
                ) : (
                  passwordMessage
                )}
              </p>
            ) : null}
          </div>
        </div>
      </DialogContent>
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Confirm your current password to update it.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handlePasswordSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="nav-user-current-password">
                Current password
              </Label>
              <Input
                id="nav-user-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                placeholder="Enter current password"
                disabled={passwordStatus === "saving"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nav-user-new-password">New password</Label>
              <Input
                id="nav-user-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
                disabled={passwordStatus === "saving"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nav-user-confirm-password">
                Confirm password
              </Label>
              <Input
                id="nav-user-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm new password"
                disabled={passwordStatus === "saving"}
              />
            </div>
            {passwordError ? (
              <p className="text-sm text-destructive">{passwordError}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="submit"
                disabled={passwordStatus === "saving"}
              >
                {passwordStatus === "saving"
                  ? "Saving..."
                  : "Update password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
