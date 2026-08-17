import React from 'react';

const BusinessStats = () => {
  const stats = [
    { title: "Total Revenue", value: "$250,000", icon: "fas fa-dollar-sign" },
    { title: "Total Orders", value: "5,000", icon: "fas fa-shopping-cart" },
    { title: "Average Order Value", value: "$50.00", icon: "fas fa-chart-line" },
    { title: "Total Products Sold", value: "10,000", icon: "fas fa-box-open" },
  ];

  return (
    <section aria-label="Business statistics" className="bg-white rounded-lg shadow p-6" id="business-stats">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Business Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-100 p-4 rounded-lg flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <i className={`${stat.icon} text-blue-600 fa-2x`}></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-700">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BusinessStats;