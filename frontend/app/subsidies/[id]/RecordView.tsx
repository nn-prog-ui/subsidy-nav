'use client';
import { useEffect } from 'react';
import { recordView } from '../../../lib/history';
import { trackEvent } from '../../../lib/events';

interface Props {
  id: string; title: string; category: string; prefecture: string; level: string; maxAmount: number | null;
}

export default function RecordView(props: Props) {
  useEffect(() => {
    recordView(props);
    trackEvent('view', { subsidyId: props.id });
  }, [props]);
  return null;
}
