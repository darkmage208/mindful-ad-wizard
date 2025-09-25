import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { approvalsAPI } from '@/lib/api'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import {
  CheckCircle,
  XCircle,
  Clock,
  Send,
  MessageSquare,
  History,
  AlertTriangle,
  User,
  Calendar,
  Loader2
} from 'lucide-react'

interface Approval {
  id: string
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES'
  submittedAt: string
  reviewedAt?: string
  reviewNotes?: string
  rejectionReasons?: string[]
  reviewer?: {
    name: string
    email: string
  }
}

interface ApprovalsManagerProps {
  campaignId: string
  campaignName: string
  campaignStatus: string
}

const statusConfig = {
  PENDING_REVIEW: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  },
  NEEDS_CHANGES: {
    label: 'Needs Changes',
    color: 'bg-orange-100 text-orange-800',
    icon: AlertTriangle
  }
}

export default function ApprovalsManager({ campaignId, campaignName, campaignStatus }: ApprovalsManagerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [approvalData, setApprovalData] = useState({
    notes: '',
    useLeadGen: true,
    usePsychologyTargeting: true
  })
  const [rejectionData, setRejectionData] = useState({
    feedback: '',
    reasons: [] as string[],
    suggestedChanges: [] as string[]
  })

  const queryClient = useQueryClient()

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['approvals', campaignId],
    queryFn: () => approvalsAPI.getHistory(campaignId).then(res => res.data.data?.approvals || [])
  })

  const submitMutation = useMutation({
    mutationFn: () => approvalsAPI.submitCampaign(campaignId),
    onSuccess: () => {
      toast.success('Campaign submitted for approval')
      queryClient.invalidateQueries({ queryKey: ['approvals', campaignId] })
      setIsSubmitting(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit campaign')
      setIsSubmitting(false)
    }
  })

  const approveMutation = useMutation({
    mutationFn: () => approvalsAPI.approveCampaign(campaignId, approvalData),
    onSuccess: () => {
      toast.success('Campaign approved successfully')
      queryClient.invalidateQueries({ queryKey: ['approvals', campaignId] })
      setShowApprovalDialog(false)
      setApprovalData({ notes: '', useLeadGen: true, usePsychologyTargeting: true })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve campaign')
    }
  })

  const rejectMutation = useMutation({
    mutationFn: () => approvalsAPI.rejectCampaign(campaignId, rejectionData),
    onSuccess: () => {
      toast.success('Campaign rejected with feedback')
      queryClient.invalidateQueries({ queryKey: ['approvals', campaignId] })
      setShowRejectDialog(false)
      setRejectionData({ feedback: '', reasons: [], suggestedChanges: [] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject campaign')
    }
  })

  const handleSubmitForApproval = () => {
    setIsSubmitting(true)
    submitMutation.mutate()
  }

  const latestApproval = history[0]
  const canSubmit = campaignStatus === 'DRAFT' || campaignStatus === 'NEEDS_CHANGES'
  const isPending = latestApproval?.status === 'PENDING_REVIEW'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Campaign Approvals</h3>
          <p className="text-sm text-muted-foreground">
            Manage campaign approval workflow
          </p>
        </div>

        {canSubmit && !isPending && (
          <Button onClick={handleSubmitForApproval} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </>
            )}
          </Button>
        )}
      </div>

      {/* Current Status */}
      {latestApproval && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {(() => {
                  const StatusIcon = statusConfig[latestApproval.status].icon
                  return <StatusIcon className="h-5 w-5" />
                })()}
                Current Status
              </div>
              <Badge className={statusConfig[latestApproval.status].color}>
                {statusConfig[latestApproval.status].label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Submitted {formatDate(latestApproval.submittedAt)}
              </div>

              {latestApproval.reviewer && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Reviewed by {latestApproval.reviewer.name}
                </div>
              )}

              {latestApproval.reviewNotes && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <MessageSquare className="h-4 w-4" />
                    Review Notes
                  </div>
                  <p className="text-sm">{latestApproval.reviewNotes}</p>
                </div>
              )}

              {latestApproval.rejectionReasons && latestApproval.rejectionReasons.length > 0 && (
                <div className="p-3 bg-red-50 rounded-md">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    Rejection Reasons
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {latestApproval.rejectionReasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Admin Actions */}
              {isPending && (
                <div className="flex gap-2 pt-3 border-t">
                  <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Approve Campaign</DialogTitle>
                        <DialogDescription>
                          Approve "{campaignName}" for launch
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                          <Textarea
                            id="approval-notes"
                            placeholder="Add any notes for the campaign approval..."
                            value={approvalData.notes}
                            onChange={(e) => setApprovalData(prev => ({ ...prev, notes: e.target.value }))}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="use-leadgen">Use Lead Generation Optimization</Label>
                          <Switch
                            id="use-leadgen"
                            checked={approvalData.useLeadGen}
                            onCheckedChange={(checked) =>
                              setApprovalData(prev => ({ ...prev, useLeadGen: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="use-psychology">Use Psychology-based Targeting</Label>
                          <Switch
                            id="use-psychology"
                            checked={approvalData.usePsychologyTargeting}
                            onCheckedChange={(checked) =>
                              setApprovalData(prev => ({ ...prev, usePsychologyTargeting: checked }))
                            }
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={() => approveMutation.mutate()}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              'Approve Campaign'
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Campaign</DialogTitle>
                        <DialogDescription>
                          Provide feedback for "{campaignName}"
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="rejection-feedback">Feedback *</Label>
                          <Textarea
                            id="rejection-feedback"
                            placeholder="Explain why the campaign needs changes..."
                            value={rejectionData.feedback}
                            onChange={(e) => setRejectionData(prev => ({ ...prev, feedback: e.target.value }))}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Common Issues (Select applicable)</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              'Targeting too broad',
                              'Budget concerns',
                              'Creative quality',
                              'Compliance issues',
                              'Missing information',
                              'Strategy alignment'
                            ].map(reason => (
                              <label key={reason} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={rejectionData.reasons.includes(reason)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setRejectionData(prev => ({
                                        ...prev,
                                        reasons: [...prev.reasons, reason]
                                      }))
                                    } else {
                                      setRejectionData(prev => ({
                                        ...prev,
                                        reasons: prev.reasons.filter(r => r !== reason)
                                      }))
                                    }
                                  }}
                                />
                                <span className="text-sm">{reason}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={() => rejectMutation.mutate()}
                            disabled={rejectMutation.isPending || !rejectionData.feedback}
                            variant="destructive"
                          >
                            {rejectMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Rejecting...
                              </>
                            ) : (
                              'Reject Campaign'
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      {history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Approval History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.slice(1).map((approval: Approval) => (
                <div key={approval.id} className="flex items-start gap-3 p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const StatusIcon = statusConfig[approval.status].icon
                      return <StatusIcon className="h-4 w-4" />
                    })()}
                    <Badge className={statusConfig[approval.status].color} variant="secondary">
                      {statusConfig[approval.status].label}
                    </Badge>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {formatDate(approval.submittedAt)}
                      {approval.reviewer && ` • Reviewed by ${approval.reviewer.name}`}
                    </div>
                    {approval.reviewNotes && (
                      <p className="text-sm">{approval.reviewNotes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {history.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No approval history</h3>
            <p className="text-muted-foreground text-center mb-4">
              Submit your campaign for approval to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}