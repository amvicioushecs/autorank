
import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { RRDataProvider } from '@/contexts/RRDataContext';

const Index: React.FC = () => {
  return (
    <AppProvider>
      <RRDataProvider>
        <AppLayout />
      </RRDataProvider>
    </AppProvider>
  );
};

export default Index;
