"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signUp } from "@/lib/auth-client"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [image, setImage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading("Creating account...")

    try {
      await signUp.email(
        {
          name,
          email,
          password,
          image: image ?? undefined,
          callbackURL: "/dashboard",
        },
        {
          onSuccess: () => {
            toast.success("Account created successfully.", { id: toastId })
            router.push("/dashboard")
          },
          onError: (ctx) => {
            toast.error(ctx.error.message, { id: toastId })
          },
        },
      )
    } catch {
      toast.error("Unable to sign up. Please try again.", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setImage(null)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImage(typeof reader.result === "string" ? reader.result : null)
    }
    reader.onerror = () => {
      toast.error("Failed to read the selected image.")
      setImage(null)
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="image">
                Profile Image{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              {image ? (
                <div className="flex items-center gap-3">
                  <Avatar className="size-16">
                    <AvatarImage src={image} alt="Profile preview" />
                    <AvatarFallback>IMG</AvatarFallback>
                  </Avatar>
                </div>
              ) : null}
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Account"}
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <a href="/sign-in">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
