import { Link } from "react-router-dom";

function OwnerDashboard() {

  return (

    <div className="max-w-6xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-8">
        Owner Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">


        {/* CREATE SALON */}

        <Link to="/owner/create-salon">

          <div className="bg-white shadow-md p-6 rounded-lg hover:shadow-lg transition">

            <h2 className="text-xl font-semibold">
              Create Salon
            </h2>

            <p className="text-gray-500 mt-2">
              Add your salon to the platform
            </p>

          </div>

        </Link>


        {/* MANAGE SERVICES */}

        <Link to="/owner/services">

          <div className="bg-white shadow-md p-6 rounded-lg hover:shadow-lg transition">

            <h2 className="text-xl font-semibold">
              Manage Services
            </h2>

            <p className="text-gray-500 mt-2">
              Add or edit salon services
            </p>

          </div>

        </Link>


        {/* VIEW BOOKINGS */}

        <Link to="/owner/bookings">

          <div className="bg-white shadow-md p-6 rounded-lg hover:shadow-lg transition">

            <h2 className="text-xl font-semibold">
              View Bookings
            </h2>

            <p className="text-gray-500 mt-2">
              See customer appointments
            </p>

          </div>

        </Link>

      </div>

    </div>

  );

}

export default OwnerDashboard;