import React, { useState, useEffect } from 'react';
import { LayoutList } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import EditCategoriesDrawer from '../../components/salon/EditCategoriesDrawer';
import { useSalon } from '../../hooks/useSalon';

const Services = () => {
  const { salon, fetchSalon, updateSalon } = useSalon();
  const [loading, setLoading] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  useEffect(() => {
    fetchSalon();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-600 mt-1">Manage your salon services</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsCategoriesOpen(true)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <LayoutList className="w-4 h-4" />
            Service Menu
          </Button>
        </div>

        {/* Service Menu display */}
        {salon?.offeredCategories?.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Service Menu</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Serves <span className="capitalize font-medium">{salon.servedGender}</span> customers
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {salon.kidsHaircut && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">👶 Kids' Haircut</span>
                )}
                {salon.atHomeServices && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">🏠 At-Home Services</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {salon.offeredCategories.map((cat, idx) => (
                <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <p className="font-medium text-gray-800 text-sm mb-2">{cat.name}</p>
                  {cat.subServices?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {cat.subServices.map((sub, si) => {
                        const name  = typeof sub === 'string' ? sub : sub.name;
                        const price = typeof sub === 'string' ? null : sub.price;
                        return (
                          <span key={si} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {name}{price > 0 && <span className="text-blue-600 font-medium">₹{price}</span>}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No sub-services selected</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
            <LayoutList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No service menu set up yet.</p>
            <button
              onClick={() => setIsCategoriesOpen(true)}
              className="mt-3 text-sm text-blue-600 font-medium hover:underline"
            >
              Set up Service Menu
            </button>
          </div>
        )}
      </div>

      <EditCategoriesDrawer
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        onOpen={fetchSalon}
        salon={salon}
        updateSalon={updateSalon}
      />
    </DashboardLayout>
  );
};

export default Services;