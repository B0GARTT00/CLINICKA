import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { Download, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRequirementEvidenceBlob } from '../services/api';
import { Button } from './ui/button';
import { Modal } from './ui/Modal';

type EvidencePreviewProps = {
  submissionId: string;
  filename: string;
  mimeType: string;
};

export function EvidencePreview({ submissionId, filename, mimeType }: EvidencePreviewProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let objectUrl: string | undefined;
    let cancelled = false;
    setError(false);
    void getRequirementEvidenceBlob(submissionId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(undefined);
    };
  }, [open, submissionId]);

  const previewable = mimeType === 'application/pdf' || mimeType.startsWith('image/');

  return <>
    <Button variant="secondary" onClick={() => setOpen(true)}><Eye className="h-4 w-4" /> View evidence</Button>
    <Modal open={open} onClose={() => setOpen(false)} title={filename} description="Secure evidence preview inside CLINICKA" maxWidth="lg">
      {error ? <Alert severity="error">The evidence could not be opened.</Alert> : !url ? <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress size={32} /></Box> : <Box sx={{ display: 'grid', gap: 2 }}>
        {mimeType.startsWith('image/') && <Box component="img" src={url} alt={filename} sx={{ display: 'block', maxWidth: '100%', maxHeight: '70vh', mx: 'auto', objectFit: 'contain' }} />}
        {mimeType === 'application/pdf' && <Box component="iframe" src={url} title={filename} sx={{ width: '100%', height: '70vh', border: 0, bgcolor: 'grey.100' }} />}
        {!previewable && <Alert severity="info">This file type cannot be previewed in the browser, but it can still be downloaded securely.</Alert>}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">Only authorized users can load this private document.</Typography>
          <Button variant="secondary" onClick={() => {
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            anchor.click();
          }}><Download className="h-4 w-4" /> Download copy</Button>
        </Box>
      </Box>}
    </Modal>
  </>;
}
