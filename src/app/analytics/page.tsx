// src/app/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";
import Navbar from "@/components/navbar";
import {
  ActiveUsersChart,
  UserGrowthChart,
  PredictionVolumeChart,
  MetricsCards
} from "@/components/analytics";

interface User {
  id: string;
  created_at: string;
}

interface Prediction {
  user_id: string;
  market_id: number;
  outcome_id: number;
  shares_amt: number;
  trade_value: number;
  created_at: string;
}

interface ActiveUsersData {
  date: string;
  active_users: number;
  cumulative_users: number;
}

interface UserGrowthData {
  date: string;
  new_users: number;
  cumulative_users: number;
}

interface PredictionVolumeData {
  date: string;
  prediction_count: number;
  total_volume: number;
}

interface AnalyticsData {
  totalUsers: number;
  totalPredictions: number;
  totalTradeVolume: number;
  activeUsersData: ActiveUsersData[];
  userGrowthData: UserGrowthData[];
  predictionVolumeData: PredictionVolumeData[];
}

type TimeFilter = "daily" | "weekly" | "monthly" | "all";

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("monthly");
  const [debugMode, setDebugMode] = useState<boolean>(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeFilter]);

  const getDateRange = () => {
    const now = new Date();
    const ranges = {
      daily: 30, // Last 30 days
      weekly: 84, // Last 12 weeks (84 days)
      monthly: 365, // Last 12 months (365 days)
      all: 730 // Last 2 years or all data
    };

    const daysBack = ranges[timeFilter];
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    if (debugMode) {
      console.log('=== DATE RANGE DEBUG ===');
      console.log('Time filter:', timeFilter);
      console.log('Days back:', daysBack);
      console.log('Start date:', startDate.toISOString());
      console.log('End date:', now.toISOString());
    }
    
    return { startDate, endDate: now };
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange();

      // Fetch all users (for total count)
      const { data: allUsersData, error: allUsersError } = await supabase
        .from("profiles")
        .select("id, created_at");

      if (allUsersError) throw new Error(`Failed to fetch users: ${allUsersError.message}`);

      const totalUsers = allUsersData?.length || 0;

      // Fetch predictions within date range
      const { data: predictionsData, error: predictionsError } = await supabase
        .from("predictions")
        .select("user_id, market_id, outcome_id, shares_amt, trade_value, created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      if (predictionsError) throw new Error(`Failed to fetch predictions: ${predictionsError.message}`);

      const totalPredictions = predictionsData?.length || 0;
      const totalTradeVolume = predictionsData?.reduce((sum, p) => sum + Math.abs(p.trade_value || 0), 0) || 0;

      if (debugMode) {
        console.log('=== FETCHED DATA DEBUG ===');
        console.log('Total users:', totalUsers);
        console.log('Total predictions in range:', totalPredictions);
        console.log('Total trade volume:', totalTradeVolume);
        console.log('Sample predictions:', predictionsData?.slice(0, 3));
        
        if (predictionsData && predictionsData.length > 0) {
          const dates = predictionsData.map(p => new Date(p.created_at));
          console.log('Prediction date range:', {
            earliest: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString(),
            latest: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
          });
          
          const uniqueUsers = [...new Set(predictionsData.map(p => p.user_id))];
          console.log('Unique users in predictions:', uniqueUsers.length, uniqueUsers.slice(0, 3));
        }
      }

      // Generate time series data
      const activeUsersData = generateActiveUsersData(predictionsData || [], startDate, endDate);
      const userGrowthData = generateUserGrowthData(allUsersData || [], startDate, endDate);
      const predictionVolumeData = generateVolumeData(predictionsData || [], startDate, endDate);

      const analytics: AnalyticsData = {
        totalUsers,
        totalPredictions,
        totalTradeVolume,
        activeUsersData,
        userGrowthData,
        predictionVolumeData
      };

      setAnalyticsData(analytics);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  const generateActiveUsersData = (predictions: Prediction[], startDate: Date, endDate: Date): ActiveUsersData[] => {
    if (debugMode) {
      console.log('=== ACTIVE USERS GENERATION DEBUG ===');
      console.log('Input predictions:', predictions.length);
      console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());
      console.log('Time filter:', timeFilter);
    }

    const data: ActiveUsersData[] = [];
    const cumulativeActiveUsers = new Set<string>();

    if (timeFilter === "monthly") {
      // Use calendar months for monthly view
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

      while (current <= end) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);

        if (debugMode) {
          console.log('Processing month:', {
            monthStart: monthStart.toISOString(),
            monthEnd: monthEnd.toISOString(),
            isCurrentMonth: monthStart.getMonth() === new Date().getMonth() && 
                            monthStart.getFullYear() === new Date().getFullYear()
          });
        }

        const monthPredictions = predictions.filter(p => {
          const predDate = new Date(p.created_at);
          return predDate >= monthStart && predDate <= monthEnd;
        });

        const activeUsersInMonth = new Set(monthPredictions.map(p => p.user_id));
        
        if (debugMode) {
          console.log('Month results:', {
            predictionsCount: monthPredictions.length,
            activeUsers: activeUsersInMonth.size,
            userIds: [...activeUsersInMonth].slice(0, 3)
          });
        }

        // Add to cumulative set
        activeUsersInMonth.forEach(userId => cumulativeActiveUsers.add(userId));

        data.push({
          date: formatDateForDisplay(monthStart),
          active_users: activeUsersInMonth.size,
          cumulative_users: cumulativeActiveUsers.size
        });

        // Move to next month
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Original logic for other time filters
      const current = new Date(startDate);

      while (current <= endDate) {
        const periodEnd = new Date(current);
        
        // Set the end of the current period
        if (timeFilter === "daily") {
          periodEnd.setDate(current.getDate() + 1);
        } else if (timeFilter === "weekly") {
          periodEnd.setDate(current.getDate() + 7);
        } else {
          periodEnd.setDate(current.getDate() + 30); // All time grouped by month
        }

        const periodPredictions = predictions.filter(p => {
          const predDate = new Date(p.created_at);
          return predDate >= current && predDate < periodEnd;
        });

        const activeUsersInPeriod = new Set(periodPredictions.map(p => p.user_id));
        
        // Add to cumulative set
        activeUsersInPeriod.forEach(userId => cumulativeActiveUsers.add(userId));

        data.push({
          date: formatDateForDisplay(current),
          active_users: activeUsersInPeriod.size,
          cumulative_users: cumulativeActiveUsers.size
        });

        // Move to next period
        if (timeFilter === "daily") {
          current.setDate(current.getDate() + 1);
        } else if (timeFilter === "weekly") {
          current.setDate(current.getDate() + 7);
        } else {
          current.setDate(current.getDate() + 30);
        }
      }
    }

    if (debugMode) {
      console.log('=== FINAL ACTIVE USERS DATA ===');
      console.log('Generated data points:', data.length);
      console.log('Sample data:', data.slice(-3)); // Last 3 entries
      console.log('Total cumulative users:', cumulativeActiveUsers.size);
    }

    return data;
  };

  const generateUserGrowthData = (users: User[], startDate: Date, endDate: Date): UserGrowthData[] => {
    const data: UserGrowthData[] = [];
    const current = new Date(startDate);
    let cumulativeUsers = 0;

    // Count users that existed before our date range
    const usersBeforeRange = users.filter(user => 
      new Date(user.created_at) < startDate
    ).length;
    cumulativeUsers = usersBeforeRange;

    while (current <= endDate) {
      const periodEnd = new Date(current);
      
      if (timeFilter === "daily") {
        periodEnd.setDate(current.getDate() + 1);
      } else if (timeFilter === "weekly") {
        periodEnd.setDate(current.getDate() + 7);
      } else if (timeFilter === "monthly") {
        periodEnd.setMonth(current.getMonth() + 1);
      } else {
        periodEnd.setDate(current.getDate() + 30);
      }

      const newUsers = users.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate >= current && userDate < periodEnd;
      }).length;

      cumulativeUsers += newUsers;

      data.push({
        date: formatDateForDisplay(current),
        new_users: newUsers,
        cumulative_users: cumulativeUsers
      });

      // Move to next period
      if (timeFilter === "daily") {
        current.setDate(current.getDate() + 1);
      } else if (timeFilter === "weekly") {
        current.setDate(current.getDate() + 7);
      } else if (timeFilter === "monthly") {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setDate(current.getDate() + 30);
      }
    }

    return data;
  };

  const generateVolumeData = (predictions: Prediction[], startDate: Date, endDate: Date): PredictionVolumeData[] => {
    const data: PredictionVolumeData[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const periodEnd = new Date(current);
      
      if (timeFilter === "daily") {
        periodEnd.setDate(current.getDate() + 1);
      } else if (timeFilter === "weekly") {
        periodEnd.setDate(current.getDate() + 7);
      } else if (timeFilter === "monthly") {
        periodEnd.setMonth(current.getMonth() + 1);
      } else {
        periodEnd.setDate(current.getDate() + 30);
      }

      const periodPredictions = predictions.filter(p => {
        const predDate = new Date(p.created_at);
        return predDate >= current && predDate < periodEnd;
      });

      const predictionCount = periodPredictions.length;
      const totalVolume = periodPredictions.reduce((sum, p) => sum + Math.abs(p.trade_value || 0), 0);

      data.push({
        date: formatDateForDisplay(current),
        prediction_count: predictionCount,
        total_volume: totalVolume
      });

      // Move to next period
      if (timeFilter === "daily") {
        current.setDate(current.getDate() + 1);
      } else if (timeFilter === "weekly") {
        current.setDate(current.getDate() + 7);
      } else if (timeFilter === "monthly") {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setDate(current.getDate() + 30);
      }
    }

    return data;
  };

  const formatDateForDisplay = (date: Date) => {
    if (timeFilter === "daily") {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (timeFilter === "weekly") {
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (timeFilter === "monthly") {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-400">Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-400">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="container mx-auto p-6">
          <p className="text-center text-gray-400">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">Prophet prediction market platform statistics</p>
        </div>

        {/* Debug Toggle */}
        <div className="mb-6">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`px-3 py-1 rounded text-sm ${
              debugMode ? "bg-yellow-600 text-white" : "bg-gray-600 text-gray-300"
            }`}
          >
            {debugMode ? "Disable Debug" : "Enable Debug"}
          </button>
          {debugMode && (
            <p className="text-yellow-400 text-sm mt-1">
              Debug mode enabled - check browser console for detailed logs
            </p>
          )}
        </div>

        {/* Time Filter Selector */}
        <div className="mb-6">
          <div className="flex gap-2">
            {[
              { key: "daily" as const, label: "Daily" },
              { key: "weekly" as const, label: "Weekly" },
              { key: "monthly" as const, label: "Monthly" },
              { key: "all" as const, label: "All Time" }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  timeFilter === key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Cards */}
        <MetricsCards 
          data={{
            totalUsers: analyticsData.totalUsers,
            totalPredictions: analyticsData.totalPredictions,
            totalTradeVolume: analyticsData.totalTradeVolume
          }}
          timeFilter={timeFilter}
          loading={false}
        />

        {/* Active Users Chart */}
        <ActiveUsersChart
          data={analyticsData.activeUsersData}
          timeFilter={timeFilter}
          loading={false}
          debugMode={debugMode}
        />

        {/* Additional Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <UserGrowthChart
            data={analyticsData.userGrowthData}
            timeFilter={timeFilter}
            loading={false}
          />

          <PredictionVolumeChart
            data={analyticsData.predictionVolumeData}
            timeFilter={timeFilter}
            loading={false}
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Analytics data updated in real-time. Time range: {timeFilter}</p>
        </div>
      </div>
    </div>
  );
}