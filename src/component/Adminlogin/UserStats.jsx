import React from 'react';

const UserStats = () => {
  const userStats = [
    { title: "Total Users", value: "10,000" },
    { title: "Active Users", value: "8,500" },
    { title: "New Users This Month", value: "300" },
  ];

  return (
    <section aria-label="User statistics" className="bg-white rounded-lg shadow p-6" id="users">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">User Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {userStats.map((stat, index) => (
          <div key={index} className="bg-gray-100 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default UserStats;