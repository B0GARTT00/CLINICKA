import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, LockKeyhole, MessageSquarePlus, Paperclip, RotateCcw, Send } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Chip, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { Button } from '../components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { createConversation, downloadPrivateDocument, getConversation, getConversations, getPatients, markConversationRead, reopenConversation, resolveConversation, sendClinicMessage, type ClinicConversation } from '../services/api';

const topics: { value: ClinicConversation['topic']; label: string }[] = [
  { value: 'APPOINTMENT', label: 'Appointment' }, { value: 'MEDICAL_CERTIFICATE', label: 'Medical certificate' },
  { value: 'MEDICAL_CLEARANCE', label: 'Medical clearance' }, { value: 'HEALTH_REQUIREMENT', label: 'Health requirement follow-up' },
  { value: 'VACCINATION_RECORD', label: 'Vaccination record' }, { value: 'MEDICINE_PICKUP', label: 'Medicine pickup' },
  { value: 'GENERAL_CLINIC_CONCERN', label: 'General clinic concern' },
];

function errorMessage(error: unknown) { return (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'The request could not be completed.'; }

export function MessagesPage() {
  const auth = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const staff = Boolean(auth.user?.roles.some((role) => ['CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR'].includes(role)));
  const [newOpen, setNewOpen] = useState(Boolean(params.get('patientId')));
  const [draft, setDraft] = useState({ patientId: params.get('patientId') ?? '', subject: '', topic: 'GENERAL_CLINIC_CONCERN' as ClinicConversation['topic'], message: '', repliesEnabled: true, relatedType: '', relatedId: '' });
  const [reply, setReply] = useState('');
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const conversations = useQuery({ queryKey: ['conversations'], queryFn: getConversations });
  const detail = useQuery({ queryKey: ['conversation', id], queryFn: () => getConversation(id!), enabled: Boolean(id), refetchInterval: 20_000 });
  const patients = useQuery({ queryKey: ['message-patients'], queryFn: () => getPatients(undefined, 1, 100), enabled: staff && newOpen });
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['conversations'] }); if (id) await queryClient.invalidateQueries({ queryKey: ['conversation', id] }); await queryClient.invalidateQueries({ queryKey: ['notifications'] }); };
  useEffect(() => {
    if (!id) return;
    void markConversationRead(id).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
  }, [id, queryClient]);
  const create = useMutation({ mutationFn: () => createConversation(draft, newAttachment), onSuccess: async (value) => { setNewOpen(false); setNewAttachment(null); await refresh(); navigate(`/messages/${value.id}`); } });
  const send = useMutation({ mutationFn: () => sendClinicMessage(id!, reply, replyAttachment), onSuccess: async () => { setReply(''); setReplyAttachment(null); await refresh(); } });
  const changeStatus = useMutation({ mutationFn: () => detail.data?.status === 'OPEN' ? resolveConversation(id!) : reopenConversation(id!), onSuccess: refresh });
  const selected = detail.data;
  const inbox = useMemo(() => conversations.data ?? [], [conversations.data]);
  if (conversations.isLoading) return <LoadingState label="Loading secure messages..." />;
  if (conversations.isError) return <ErrorState message="Unable to load secure messages." onRetry={() => void conversations.refetch()} />;

  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    <PageHeader eyebrow="Secure communication" title="Messages" description="Private clinic-to-patient conversations. Clinical documentation remains in the patient record." action={staff ? <Button onClick={() => setNewOpen(true)}><MessageSquarePlus className="h-4 w-4" /> Message patient</Button> : undefined} />
    <Alert icon={<LockKeyhole size={18} />} severity="info">Notification previews never display message content or medical details.</Alert>
    <Paper variant="outlined" sx={{ minHeight: 590, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '340px minmax(0,1fr)' }, overflow: 'hidden', borderRadius: 3 }}>
      <Box sx={{ borderRight: { md: 1 }, borderColor: 'divider', maxHeight: 680, overflowY: 'auto' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}><Typography variant="subtitle2">Inbox</Typography><Typography variant="caption" color="text.secondary">{inbox.length} conversation{inbox.length === 1 ? '' : 's'}</Typography></Box>
        {inbox.map((item) => {
          const last = item.messages[0];
          const lastReadAt = item.participants?.[0]?.lastReadAt;
          const unread = Boolean(last && (!lastReadAt || new Date(last.createdAt) > new Date(lastReadAt)));
          const active = item.id === id;
          return <Box key={item.id} component="button" onClick={() => navigate(`/messages/${item.id}`)} sx={{ width: '100%', textAlign: 'left', border: 0, borderBottom: 1, borderColor: 'divider', bgcolor: active ? 'primary.50' : 'transparent', p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}><Typography variant="body2" sx={{ fontWeight: unread ? 800 : 600 }}>{item.subject}</Typography><Box sx={{ display: 'flex', gap: .5, alignItems: 'center' }}>{unread && <Chip size="small" label="Unread" color="info" /> }<Chip size="small" label={item.status} color={item.status === 'OPEN' ? 'success' : 'default'} /></Box></Box><Typography variant="caption" color="text.secondary">{item.patient.firstName} {item.patient.lastName} · {topics.find((topic) => topic.value === item.topic)?.label}</Typography><Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 1 }}>{last?.content ?? 'No messages yet'}</Typography></Box>;
        })}
        {!inbox.length && <EmptyState title="No conversations" description={staff ? 'Start a secure conversation from here or a patient profile.' : 'Clinic messages sent to you will appear here.'} />}
      </Box>
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {!id ? <EmptyState title="Select a conversation" description="Choose a secure clinic conversation from the inbox." /> : detail.isLoading ? <LoadingState label="Opening conversation..." /> : detail.isError || !selected ? <ErrorState message="Unable to open this conversation." onRetry={() => void detail.refetch()} /> : <>
          <Box sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}><Box><Typography variant="h6">{selected.subject}</Typography><Typography variant="caption" color="text.secondary">{selected.patient.firstName} {selected.patient.lastName} · {selected.patient.patientNumber} · {topics.find((topic) => topic.value === selected.topic)?.label}</Typography></Box>{staff && <Button variant="secondary" onClick={() => changeStatus.mutate()}>{selected.status === 'OPEN' ? <><CheckCircle2 className="h-4 w-4" /> Resolve</> : <><RotateCcw className="h-4 w-4" /> Reopen</>}</Button>}</Box>
          <Box sx={{ flex: 1, p: 2.5, overflowY: 'auto', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 2 }}>{selected.messages.map((message) => { const mine = message.sender.id === auth.user?.id; return <Box key={message.id} sx={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}><Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: mine ? 'primary.main' : 'background.paper', color: mine ? 'primary.contrastText' : 'text.primary', border: mine ? 0 : 1, borderColor: 'divider', whiteSpace: 'pre-wrap' }}>{message.content}{message.attachments?.map(({ id: attachmentId, document }) => <Box component="button" type="button" key={attachmentId} onClick={() => void downloadPrivateDocument(document.id, document.filename)} sx={{ mt: 1.25, width: '100%', border: 1, borderColor: mine ? 'rgba(255,255,255,.45)' : 'divider', borderRadius: 1.5, p: 1, bgcolor: mine ? 'rgba(255,255,255,.12)' : 'action.hover', color: 'inherit', display: 'flex', gap: 1, alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}><Paperclip size={15} /><Box sx={{ minWidth: 0, flex: 1 }}><Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 700 }}>{document.filename}</Typography><Typography variant="caption" sx={{ opacity: .8 }}>{Math.ceil(document.sizeBytes / 1024)} KB</Typography></Box><Download size={15} /></Box>)}</Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .5, textAlign: mine ? 'right' : 'left' }}>{message.sender.displayName} · {new Date(message.createdAt).toLocaleString()}</Typography></Box>; })}</Box>
          <Box component="form" onSubmit={(event) => { event.preventDefault(); if (reply.trim()) send.mutate(); }} sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'grid', gridTemplateColumns: '1fr auto', gap: 1.5 }}><TextField fullWidth multiline maxRows={4} placeholder={selected.status !== 'OPEN' ? 'This conversation is resolved.' : !selected.repliesEnabled && !staff ? 'Replies are disabled.' : 'Write a secure reply…'} value={reply} onChange={(event) => setReply(event.target.value)} disabled={selected.status !== 'OPEN' || (!selected.repliesEnabled && !staff)} /><Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><Button type="button" variant="secondary" disabled={selected.status !== 'OPEN'} onClick={() => document.getElementById('reply-attachment')?.click()}><Paperclip className="h-4 w-4" /> {replyAttachment ? 'Attached' : 'Attach'}</Button><input id="reply-attachment" hidden type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setReplyAttachment(event.target.files?.[0] ?? null)} /><Button type="submit" disabled={!reply.trim() || send.isPending || selected.status !== 'OPEN'}><Send className="h-4 w-4" /> Send</Button></Box>{replyAttachment && <Typography variant="caption" color="text.secondary">{replyAttachment.name} · maximum 5 MB</Typography>}{send.isError && <Alert severity="error">{errorMessage(send.error)}</Alert>}</Box>
        </>}
      </Box>
    </Paper>
    <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Message patient" description="The patient will receive a private, content-free notification.">
      <Box component="form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }} sx={{ display: 'grid', gap: 2 }}>
        <TextField select label="Patient" required value={draft.patientId} onChange={(event) => setDraft({ ...draft, patientId: event.target.value })}>{patients.data?.filter((patient) => patient.user).map((patient) => <MenuItem key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.patientNumber}</MenuItem>)}</TextField>
        <TextField select label="Topic" value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value as ClinicConversation['topic'] })}>{topics.map((topic) => <MenuItem key={topic.value} value={topic.value}>{topic.label}</MenuItem>)}</TextField>
        <TextField label="Subject" required value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} slotProps={{ htmlInput: { maxLength: 160 } }} />
        <TextField label="Message" required multiline minRows={5} value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} slotProps={{ htmlInput: { maxLength: 5000 } }} />
        <Button type="button" variant="secondary" onClick={() => document.getElementById('new-message-attachment')?.click()}><Paperclip className="h-4 w-4" /> {newAttachment ? newAttachment.name : 'Attach private PDF or image'}</Button><input id="new-message-attachment" hidden type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setNewAttachment(event.target.files?.[0] ?? null)} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2 }}><TextField select label="Related clinic record (optional)" value={draft.relatedType} onChange={(event) => setDraft({ ...draft, relatedType: event.target.value, relatedId: '' })}><MenuItem value="">None</MenuItem><MenuItem value="APPOINTMENT">Appointment</MenuItem><MenuItem value="CERTIFICATE">Certificate</MenuItem><MenuItem value="CLEARANCE">Clearance</MenuItem><MenuItem value="REQUIREMENT">Health requirement</MenuItem></TextField><TextField label="Record ID" value={draft.relatedId} disabled={!draft.relatedType} onChange={(event) => setDraft({ ...draft, relatedId: event.target.value })} helperText="Paste the existing record ID" /></Box>
        <TextField select label="Patient replies" value={draft.repliesEnabled ? 'enabled' : 'disabled'} onChange={(event) => setDraft({ ...draft, repliesEnabled: event.target.value === 'enabled' })}><MenuItem value="enabled">Enabled</MenuItem><MenuItem value="disabled">Disabled</MenuItem></TextField>
        {create.isError && <Alert severity="error">{errorMessage(create.error)}</Alert>}
        <Alert severity="warning">Confirm that this message is clinic-related and contains no information that belongs only in the official clinical record.</Alert>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}><Button type="button" variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button><Button type="submit" disabled={!draft.patientId || !draft.subject.trim() || !draft.message.trim()} loading={create.isPending}>Confirm and send</Button></Box>
      </Box>
    </Modal>
  </Box>;
}
