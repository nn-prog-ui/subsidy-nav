'use client';
import { useEffect } from 'react';
import { recordView } from '../../../lib/history';

interface Props {
  id: string; title: string; category: string; prefecture: string; level: string; maxAmount: number | null;
}

export default function RecordView(props: Props) {
  useEffect(() => {
    recordView(props);
  }, [props]);
  return null;
}
