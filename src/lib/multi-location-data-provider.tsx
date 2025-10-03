"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import type { User, Clinic, Product, Order, Visit, Collection, PlanTask, ActivityLog, Notification, Expense, Debt } from './types';

interface MultiLocationDataContextProps {
  isClient: boolean;
  isLoading: boolean;
  currentUser: User | null;
  userLocations: string[];
  primaryLocation: string;
  
  // Enhanced getters with location filtering
  getClinicsForUser: () => Promise<Clinic[]>;
  getOrdersForUser: () => Promise<Order[]>;
  getVisitsForUser: () => Promise<Visit[]>;
  getAllAreas: () => string[];
  getAllLines: () => string[];
  
  // Standard getters (admin access)
  getAllClinics: () => Promise<Clinic[]>;
  getAllUsers: () => Promise<User[]>;
  getAllOrders: () => Promise<Order[]>;
  
  // Location-aware filtering utilities
  filterClinicsByLocation: (clinics: Clinic[], locations: string[]) => Clinic[];
  filterUsersByLocation: (users: User[], locations: string[]) => User[];
  isUserInSameLocation: (user: User) => boolean;
  isClinicInUserLocation: (clinic: Clinic) => boolean;
  
  // CRUD operations (same as before but with location awareness)
  addClinic: (clinic: Omit<Clinic, 'id'>) => Promise<Clinic>;
  updateClinic: (id: string, data: Partial<Clinic>) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
}

const MultiLocationDataContext = createContext<MultiLocationDataContextProps | undefined>(undefined);

interface MultiLocationDataProviderProps {
  children: ReactNode;
}

export function MultiLocationDataProvider({ children }: MultiLocationDataProviderProps) {
  const { data: session } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data states
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [allAreas, setAllAreas] = useState<string[]>([]);
  const [allLines, setAllLines] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
    setIsLoading(false);
  }, []);

  // Get current user info
  const currentUser = useMemo(() => session?.user as User | null, [session?.user]);

  // Get user locations from database
  const [userLocations, setUserLocations] = useState<string[]>([]);
  const [primaryLocation, setPrimaryLocation] = useState<string>('');

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchUserLocations = async () => {
      try {
        const response = await fetch(`/api/users/${currentUser.id}/locations`);
        if (response.ok) {
          const data = await response.json();
          setUserLocations(data.locations || []);
          setPrimaryLocation(data.primaryLocation || '');
        }
      } catch (error) {
        console.error('Failed to fetch user locations:', error);
        // Fallback to area field
        if (currentUser.area) {
          setUserLocations([currentUser.area]);
          setPrimaryLocation(currentUser.area);
        }
      }
    };

    fetchUserLocations();
  }, [currentUser?.id, currentUser?.area]);

  // Fetch all data functions
  const getAllClinics = useCallback(async (): Promise<Clinic[]> => {
    try {
      const response = await fetch('/api/clinics?include_locations=true');
      if (response.ok) {
        const clinics = await response.json();
        setAllClinics(clinics);
        
        // Extract areas and lines
        const areas = new Set<string>();
        const lines = new Set<string>();
        
        clinics.forEach((clinic: any) => {
          if (clinic.clinic_locations?.length > 0) {
            clinic.clinic_locations.forEach((loc: any) => {
              areas.add(loc.location_name);
            });
          } else if (clinic.area) {
            areas.add(clinic.area);
          }
          
          if (clinic.line) {
            lines.add(clinic.line);
          }
        });
        
        setAllAreas(Array.from(areas));
        setAllLines(Array.from(lines));
        
        return clinics;
      }
    } catch (error) {
      console.error('Failed to fetch clinics:', error);
    }
    return [];
  }, []);

  const getAllUsers = useCallback(async (): Promise<User[]> => {
    try {
      const response = await fetch('/api/users?include_locations=true');
      if (response.ok) {
        const users = await response.json();
        setAllUsers(users);
        return users;
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
    return [];
  }, []);

  const getAllOrders = useCallback(async (): Promise<Order[]> => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const orders = await response.json();
        setAllOrders(orders);
        return orders;
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
    return [];
  }, []);

  // Location filtering utilities
  const filterClinicsByLocation = useCallback((clinics: Clinic[], locations: string[]): Clinic[] => {
    if (!locations.length) return clinics;
    
    return clinics.filter(clinic => {
      // Check if clinic has multi-location data
      if (clinic.clinic_locations?.length > 0) {
        return clinic.clinic_locations.some((loc: any) => 
          locations.includes(loc.location_name)
        );
      }
      
      // Fallback to area field
      return clinic.area && locations.includes(clinic.area);
    });
  }, []);

  const filterUsersByLocation = useCallback((users: User[], locations: string[]): User[] => {
    if (!locations.length) return users;
    
    return users.filter(user => {
      // Admins can see all
      if (user.role === 'admin') return true;
      
      // Check if user has multi-location data
      if (user.user_locations?.length > 0) {
        return user.user_locations.some((loc: any) => 
          locations.includes(loc.location_name)
        );
      }
      
      // Fallback to area field
      return user.area && locations.includes(user.area);
    });
  }, []);

  const isUserInSameLocation = useCallback((user: User): boolean => {
    if (!userLocations.length) return true;
    if (user.role === 'admin') return true;
    
    // Check multi-location data
    if (user.user_locations?.length > 0) {
      return user.user_locations.some((loc: any) => 
        userLocations.includes(loc.location_name)
      );
    }
    
    // Fallback to area field
    return user.area ? userLocations.includes(user.area) : true;
  }, [userLocations]);

  const isClinicInUserLocation = useCallback((clinic: Clinic): boolean => {
    if (!userLocations.length) return true;
    
    // Check multi-location data
    if (clinic.clinic_locations?.length > 0) {
      return clinic.clinic_locations.some((loc: any) => 
        userLocations.includes(loc.location_name)
      );
    }
    
    // Fallback to area field
    return clinic.area ? userLocations.includes(clinic.area) : true;
  }, [userLocations]);

  // Enhanced getters with location filtering
  const getClinicsForUser = useCallback(async (): Promise<Clinic[]> => {
    const allClinicsData = await getAllClinics();
    
    // Admin sees all clinics
    if (currentUser?.role === 'admin') {
      return allClinicsData;
    }
    
    // Filter by user locations
    return filterClinicsByLocation(allClinicsData, userLocations);
  }, [getAllClinics, currentUser?.role, filterClinicsByLocation, userLocations]);

  const getOrdersForUser = useCallback(async (): Promise<Order[]> => {
    const allOrdersData = await getAllOrders();
    
    // Admin sees all orders
    if (currentUser?.role === 'admin') {
      return allOrdersData;
    }
    
    // Filter orders by clinics in user's locations
    const userClinics = await getClinicsForUser();
    const userClinicIds = new Set(userClinics.map(c => c.id));
    
    return allOrdersData.filter(order => 
      userClinicIds.has(order.clinic_id)
    );
  }, [getAllOrders, currentUser?.role, getClinicsForUser]);

  const getVisitsForUser = useCallback(async (): Promise<Visit[]> => {
    // Similar logic for visits
    const allVisitsData = await getAllVisits();
    
    if (currentUser?.role === 'admin') {
      return allVisitsData;
    }
    
    // Filter by user's locations if needed
    return allVisitsData.filter(visit => 
      isUserInSameLocation({ ...currentUser, area: visit.area } as User)
    );
  }, [currentUser?.role, isUserInSameLocation]);

  const getAllVisits = useCallback(async (): Promise<Visit[]> => {
    try {
      const response = await fetch('/api/visits');
      if (response.ok) {
        const visits = await response.json();
        setAllVisits(visits);
        return visits;
      }
    } catch (error) {
      console.error('Failed to fetch visits:', error);
    }
    return [];
  }, []);

  // CRUD operations with location support
  const addClinic = useCallback(async (clinicData: Omit<Clinic, 'id'>): Promise<Clinic> => {
    try {
      const response = await fetch('/api/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinicData)
      });
      
      if (response.ok) {
        const newClinic = await response.json();
        
        // Refresh clinics data
        await getAllClinics();
        
        return newClinic;
      }
      
      throw new Error('Failed to create clinic');
    } catch (error) {
      console.error('Error adding clinic:', error);
      throw error;
    }
  }, [getAllClinics]);

  const updateClinic = useCallback(async (id: string, data: Partial<Clinic>): Promise<void> => {
    try {
      const response = await fetch(`/api/clinics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        // Refresh clinics data
        await getAllClinics();
      } else {
        throw new Error('Failed to update clinic');
      }
    } catch (error) {
      console.error('Error updating clinic:', error);
      throw error;
    }
  }, [getAllClinics]);

  const addUser = useCallback(async (userData: Omit<User, 'id'>): Promise<User> => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const newUser = await response.json();
        
        // Refresh users data
        await getAllUsers();
        
        return newUser;
      }
      
      throw new Error('Failed to create user');
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }, [getAllUsers]);

  const updateUser = useCallback(async (id: string, data: Partial<User>): Promise<void> => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        // Refresh users data
        await getAllUsers();
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [getAllUsers]);

  const value = useMemo(() => ({
    isClient,
    isLoading,
    currentUser,
    userLocations,
    primaryLocation,
    
    // Enhanced getters
    getClinicsForUser,
    getOrdersForUser,
    getVisitsForUser,
    getAllAreas: () => allAreas,
    getAllLines: () => allLines,
    
    // Admin getters
    getAllClinics,
    getAllUsers,
    getAllOrders,
    
    // Filtering utilities
    filterClinicsByLocation,
    filterUsersByLocation,
    isUserInSameLocation,
    isClinicInUserLocation,
    
    // CRUD operations
    addClinic,
    updateClinic,
    addUser,
    updateUser
  }), [
    isClient,
    isLoading,
    currentUser,
    userLocations,
    primaryLocation,
    getClinicsForUser,
    getOrdersForUser,
    getVisitsForUser,
    allAreas,
    allLines,
    getAllClinics,
    getAllUsers,
    getAllOrders,
    filterClinicsByLocation,
    filterUsersByLocation,
    isUserInSameLocation,
    isClinicInUserLocation,
    addClinic,
    updateClinic,
    addUser,
    updateUser
  ]);

  return (
    <MultiLocationDataContext.Provider value={value}>
      {children}
    </MultiLocationDataContext.Provider>
  );
}

export function useMultiLocationData() {
  const context = useContext(MultiLocationDataContext);
  if (context === undefined) {
    throw new Error('useMultiLocationData must be used within a MultiLocationDataProvider');
  }
  return context;
}