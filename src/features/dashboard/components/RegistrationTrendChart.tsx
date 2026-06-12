
"use client"
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import { DailyRegistrationTrend } from "@/src/features/dashboard/types";

export default function RegistrationTrendChart({ data }: { data: DailyRegistrationTrend[] }) {
  return (
    <section className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            {/* Subtle grid background lines */}
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />

            {/* X and Y Axes mapping values from keys */}
            <XAxis dataKey="day" padding={{ left: 30, right: 30 }} />
            <YAxis />

            {/* Hover popup for tracking coordinates */}
            <Tooltip />

            {/* Colored tags showing data types at the bottom */}
            <Legend />

            {/* First Data Line: Smooth curved spline */}
            <Line
              type="monotone"
              dataKey="registrations"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />


          </LineChart>
        </ResponsiveContainer>
      </div>    </section>
  );
}
