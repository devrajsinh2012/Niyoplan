'use client';

import React from 'react';
import OrgCentralKanban from '@/components/dashboard/OrgCentralKanban';

export default function CentralKanbanPage() {
  return (
    <div className="-mx-6 -my-5 h-[calc(100vh-60px)] animate-fade-in text-primary flex flex-col">
      <OrgCentralKanban isFullPage={true} />
    </div>
  );
}

