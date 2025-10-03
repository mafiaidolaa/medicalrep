"use client";

import React, { useState, useEffect } from 'react';
import { Check, MapPin, Star, X } from 'lucide-react';

interface MultiSelectLocationsProps {
  locations: string[];
  selectedLocations: string[];
  primaryLocation?: string;
  onSelectionChange: (selected: string[]) => void;
  onPrimaryChange?: (primary: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  showPrimary?: boolean;
}

export const MultiSelectLocations: React.FC<MultiSelectLocationsProps> = ({
  locations = [],
  selectedLocations = [],
  primaryLocation,
  onSelectionChange,
  onPrimaryChange,
  label = "المواقع",
  placeholder = "اختر المواقع المطلوبة",
  className = "",
  disabled = false,
  required = false,
  showPrimary = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLocations = locations.filter(location =>
    location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLocationToggle = (location: string) => {
    if (disabled) return;
    
    const newSelection = selectedLocations.includes(location)
      ? selectedLocations.filter(l => l !== location)
      : [...selectedLocations, location];
    
    onSelectionChange(newSelection);

    // If this was the primary location and it's being removed, clear primary
    if (!newSelection.includes(location) && primaryLocation === location) {
      onPrimaryChange?.(newSelection[0] || '');
    }
  };

  const handlePrimaryChange = (location: string) => {
    if (disabled || !selectedLocations.includes(location)) return;
    onPrimaryChange?.(location);
  };

  const removeLocation = (location: string) => {
    handleLocationToggle(location);
  };

  useEffect(() => {
    // Auto-set primary if not set and we have selections
    if (selectedLocations.length > 0 && !primaryLocation && onPrimaryChange) {
      onPrimaryChange(selectedLocations[0]);
    }
  }, [selectedLocations, primaryLocation, onPrimaryChange]);

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}

      {/* Selected locations display */}
      <div className="min-h-[2.5rem] w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
        <div className="flex flex-wrap gap-2">
          {selectedLocations.length === 0 ? (
            <span className="text-gray-500 text-sm py-1">{placeholder}</span>
          ) : (
            selectedLocations.map(location => (
              <div
                key={location}
                className={`
                  inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                  ${primaryLocation === location 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }
                  transition-all duration-200 hover:shadow-sm
                `}
              >
                <MapPin className="w-3 h-3 ml-2" />
                <span>{location}</span>
                {primaryLocation === location && showPrimary && (
                  <Star className="w-3 h-3 mr-1 fill-current text-blue-600" />
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeLocation(location)}
                    className="mr-1 hover:text-red-600 transition-colors duration-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
          
          {/* Add button */}
          {!disabled && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full border border-blue-200 border-dashed transition-all duration-200"
            >
              + إضافة موقع
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="بحث عن موقع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filteredLocations.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                لا توجد مواقع مطابقة
              </div>
            ) : (
              filteredLocations.map(location => {
                const isSelected = selectedLocations.includes(location);
                const isPrimary = primaryLocation === location;
                
                return (
                  <div
                    key={location}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <label className="flex items-center cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleLocationToggle(location)}
                        className="hidden"
                      />
                      <div className={`
                        w-5 h-5 border-2 rounded ml-3 flex items-center justify-center transition-all duration-200
                        ${isSelected 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-gray-300 hover:border-blue-400'
                        }
                      `}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex items-center flex-1">
                        <MapPin className="w-4 h-4 ml-2 text-gray-400" />
                        <span className="text-sm text-gray-700">{location}</span>
                        {isPrimary && showPrimary && (
                          <Star className="w-4 h-4 mr-2 fill-current text-blue-500" />
                        )}
                      </div>
                    </label>

                    {/* Primary button */}
                    {isSelected && showPrimary && onPrimaryChange && (
                      <button
                        type="button"
                        onClick={() => handlePrimaryChange(location)}
                        className={`
                          px-2 py-1 text-xs rounded transition-all duration-200
                          ${isPrimary 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                          }
                        `}
                        title={isPrimary ? "الموقع الرئيسي" : "اجعله الموقع الرئيسي"}
                      >
                        {isPrimary ? "رئيسي" : "اجعل رئيسي"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Close button */}
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};