import React from 'react';
import { Calendar } from 'lucide-react';
import Button from '../common/Button';

/**
 * DateRangeFilter Component
 * 
 * Allows user to select date range for reports
 */
const DateRangeFilter = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
  loading = false,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Date Range</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Quick presets:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onStartDateChange(thirtyDaysAgo);
                onEndDateChange(today);
              }}
              disabled={loading}
            >
              Last 30 Days
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split('T')[0];
                onStartDateChange(ninetyDaysAgo);
                onEndDateChange(today);
              }}
              disabled={loading}
            >
              Last 90 Days
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split('T')[0];
                onStartDateChange(yearAgo);
                onEndDateChange(today);
              }}
              disabled={loading}
            >
              Last Year
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReset}
              disabled={loading}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeFilter;