import React from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatT, sampleCurve, X_TICKS, Y_TICKS } from '@/lib/kitScaler';

export default function ScalerChart({ a0 }) {
  const data = sampleCurve(a0);

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={X_TICKS}
            tickFormatter={(value) => formatT(10 ** value)}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis
            scale="log"
            domain={[1, 1000]}
            ticks={Y_TICKS}
            allowDataOverflow
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            width={52}
          />
          <Tooltip
            labelFormatter={(value) => `T = ${formatT(10 ** value)}`}
            formatter={(value) => [value, 'Setting(T)']}
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12
            }}
          />
          <ReferenceLine y={1} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}