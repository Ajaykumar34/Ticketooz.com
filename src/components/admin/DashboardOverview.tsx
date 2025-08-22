
import { useState } from 'react';
import AdminDashboardStats from './AdminDashboardStats';

const DashboardOverview = () => {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const handleStateChange = (state: string) => {
    console.log('DashboardOverview - State change:', { state, isEmptyString: state === '' });
    // Convert empty string to null to avoid Radix UI error
    const stateValue = state === '' ? null : state;
    setSelectedState(stateValue);
    setSelectedCity(null); // Reset city when state changes
  };

  const handleCityChange = (city: string) => {
    console.log('DashboardOverview - City change:', { city, isEmptyString: city === '' });
    // Convert empty string to null to avoid Radix UI error
    const cityValue = city === '' ? null : city;
    setSelectedCity(cityValue);
  };

  console.log('DashboardOverview - Current state:', { 
    selectedState, 
    selectedCity,
    selectedStateType: typeof selectedState,
    selectedCityType: typeof selectedCity
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground">
          Get insights into your event booking platform performance
        </p>
      </div>

      <AdminDashboardStats
        selectedState={selectedState || ''}
        selectedCity={selectedCity || ''}
        onStateChange={handleStateChange}
        onCityChange={handleCityChange}
      />
    </div>
  );
};

export default DashboardOverview;
