import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2, UserX, Settings, Shield } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "warning"
  icon?: React.ReactNode
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  icon,
  isLoading = false,
}: ConfirmDialogProps) {
  const getIcon = () => {
    if (icon) return icon
    
    switch (variant) {
      case "destructive":
        return <Trash2 className="h-4 w-4" />
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getButtonVariant = () => {
    switch (variant) {
      case "destructive":
        return "destructive"
      case "warning":
        return "default"
      default:
        return "default"
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Specialized confirmation dialogs for common actions
export function DeleteUserConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  userName,
  isLoading = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  userName: string
  isLoading?: boolean
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete User Account"
      description={`Are you sure you want to delete ${userName}'s account? This action cannot be undone and will remove all associated data including campaigns, leads, and settings.`}
      confirmText="Delete User"
      cancelText="Keep User"
      variant="destructive"
      icon={<UserX className="h-4 w-4" />}
      isLoading={isLoading}
    />
  )
}

export function UpdateCampaignConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  campaignName,
  isLoading = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  campaignName: string
  isLoading?: boolean
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Update Campaign"
      description={`Are you sure you want to update "${campaignName}"? This will modify the campaign settings and may affect its performance.`}
      confirmText="Update Campaign"
      cancelText="Cancel"
      variant="default"
      icon={<Settings className="h-4 w-4" />}
      isLoading={isLoading}
    />
  )
}
