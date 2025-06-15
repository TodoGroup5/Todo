import React from 'react';

interface Todo {
  id: number;
  title: string;
  description: string;
  status_id: number;
  status_name: string;
  assigned_to: number;
  created_by: number;
  created_at: string;
  team_id: number;
  due_date?: string;
  updated_at: string;
}

interface Status {
  id: number;
  name: string;
}

interface AnalyticsBarChartProps {
  todos: Todo[];
  statuses: Status[];
}

const AnalyticsBarChart: React.FC<AnalyticsBarChartProps> = ({ todos, statuses }) => {
  const statusCounts = statuses.map(status => {
    const count = todos.filter(todo => todo.status_id === status.id).length;
    return {
      ...status,
      count
    };
  });

  const maxCount = Math.max(...statusCounts.map(s => s.count), 1);
  const totalTodos = todos.length;

  const getStatusColor = (statusId: number) => {
    switch (statusId) {
      case 0: return '#c53030';
      case 1: return '#d69e2e';
      case 2: return '#38a169'; 
      default: return '#718096';
    }
  };

  const getStatusBackgroundColor = (statusId: number) => {
    switch (statusId) {
      case 0: return '#fed7d7'; 
      case 1: return '#fef2c7';
      case 2: return '#c6f6d5';
      default: return '#f7fafc';
    }
  };

  if (totalTodos === 0) {
    return (
      <div className="analytics-chart">
        <h4>Team Analytics</h4>
        <div className="no-data-message">
          <p>No todos available for analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-chart">
      <h4>Team Todo Analytics</h4>
      <div className="chart-summary">
        <span>Total TODOs: <strong>{totalTodos}</strong></span>
      </div>
      
      <div className="bar-chart">
        {statusCounts.map(status => {
          const percentage = totalTodos > 0 ? (status.count / totalTodos * 100) : 0;
          const barHeight = maxCount > 0 ? (status.count / maxCount * 100) : 0;
          
          return (
            <div key={status.id} className="bar-container">
              <div className="bar-wrapper">
                <div 
                  className="bar"
                  style={{
                    height: `${Math.max(barHeight, 2)}%`,
                    backgroundColor: getStatusColor(status.id),
                    borderRadius: '4px 4px 0 0'
                  }}
                >
                  {status.count > 0 && (
                    <div className="bar-value">{status.count}</div>
                  )}
                </div>
              </div>
              <div className="bar-label">
                <div 
                  className="status-indicator"
                  style={{
                    backgroundColor: getStatusBackgroundColor(status.id),
                    color: getStatusColor(status.id)
                  }}
                >
                  {status.name}
                </div>
                <div className="percentage">{percentage.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalyticsBarChart;