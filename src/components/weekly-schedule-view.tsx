
"use client";

import type { FC, ReactNode } from 'react';

interface ScheduleEntryProps {
  time: string;
  type: 'scan' | 'lab' | 'available' | 'compliance' | 'follow-up';
  title?: string;
  details?: string[];
  room?: string;
  bgColorClass: string;
  textColorClass?: string;
  className?: string;
}

const ScheduleEntry: FC<ScheduleEntryProps> = ({
  time,
  type,
  title,
  details,
  room,
  bgColorClass,
  textColorClass = "text-gray-700", // Darker text for better contrast on light backgrounds
  className = "",
}) => {
  return (
    <div
      className={`p-1.5 border border-gray-300 rounded ${bgColorClass} ${textColorClass} text-[10px] leading-tight break-words flex flex-col justify-between shadow-sm ${className}`}
    >
      <div>
        <div className="font-semibold mb-0.5">{time}</div>
        {title && <div className="font-medium text-[11px]">{title}</div>}
        {details &&
          details.map((detail, index) => (
            <div key={index} className="text-gray-600">
              {detail}
            </div>
          ))}
        {room && <div className="text-gray-600">Room: {room}</div>}
      </div>
      {type !== 'available' && type !== 'compliance' && (
        <div className="mt-1 text-right text-gray-500">=</div>
      )}
    </div>
  );
};

interface DayColumnProps {
  dayName: string;
  date: string;
  resourceName?: string;
  children: ReactNode;
}

const DayColumn: FC<DayColumnProps> = ({ dayName, date, resourceName, children }) => {
  return (
    <div className="flex-1 min-w-[120px] border-l border-gray-300 first:border-l-0">
      <div className="text-center text-[10px] text-gray-500 py-0.5 border-b border-gray-300 bg-gray-50 h-[20px] flex items-center justify-center">
        {resourceName || "..."}
      </div>
      <div className="text-center font-semibold text-xs py-1 border-b border-gray-300 bg-gray-100 h-[30px] flex items-center justify-center">
        {dayName}, {date}
      </div>
      <div className="p-0.5 space-y-0.5 bg-gray-50 min-h-[400px]">
        {children}
      </div>
    </div>
  );
};

const WeeklyScheduleView = () => {
  // Data structure based on the visual cues from the image
  const scheduleEntries = {
    tuesday9: [
      { time: '7:00am-8:00am', type: 'scan' as const, title: 'Scan: CT', details: ['Patient:', 'DGR DOB:'], bgColorClass: 'bg-blue-100 hover:bg-blue-200', className:'min-h-[50px]' },
      { time: '8:00am-9:00am', type: 'available' as const, title: 'Available', bgColorClass: 'bg-pink-100 hover:bg-pink-200', className:'min-h-[50px]' },
      { time: '9:00am-10:00am', type: 'scan' as const, title: 'Scan: Fluoroscopy', details: ['Patient:', 'MSC DOB:'], bgColorClass: 'bg-blue-100 hover:bg-blue-200', className:'min-h-[50px]' },
      { time: '10:00am-11:00am', type: 'scan' as const, title: 'Scan: Fluoroscopy', details:['Patient:', 'XYZ DOB:'], bgColorClass: 'bg-blue-100 hover:bg-blue-200', className:'min-h-[50px]' },
    ],
    wednesday10: [
      { time: '7:00am-7:30am', type: 'lab' as const, title: 'Lab', bgColorClass: 'bg-green-100 hover:bg-green-200', className:'min-h-[30px]' },
      { time: '7:30am-8:00am', type: 'lab' as const, title: 'Lab', bgColorClass: 'bg-green-100 hover:bg-green-200', className:'min-h-[30px]' },
      { time: '8:00am-9:00am', type: 'available' as const, title: 'Available', bgColorClass: 'bg-pink-100 hover:bg-pink-200', className:'min-h-[50px]' },
      { time: '9:00am-9:30am', type: 'lab' as const, title: 'Lab', bgColorClass: 'bg-green-100 hover:bg-green-200', className:'min-h-[30px]' },
      { time: '9:30am-10:00am', type: 'lab' as const, title: 'Lab', bgColorClass: 'bg-green-100 hover:bg-green-200', className:'min-h-[30px]' },
      { time: '10:00am-11:00am', type: 'available' as const, title: 'Available', bgColorClass: 'bg-pink-100 hover:bg-pink-200', className:'min-h-[50px]' },
    ],
    thursday11: [
      { time: '7:00am-8:00am', type: 'available' as const, title: 'Available', bgColorClass: 'bg-pink-100 hover:bg-pink-200', className:'min-h-[50px]' },
      { time: '8:00am-9:00am', type: 'scan' as const, title: 'Scan: CT', details: ['Patient:', 'AMO DOB:'], bgColorClass: 'bg-blue-100 hover:bg-blue-200', className:'min-h-[50px]' },
      { time: '9:00am-10:00am', type: 'scan' as const, title: 'Scan: CT', details: ['Patient:', 'KST BOB:'], bgColorClass: 'bg-blue-100 hover:bg-blue-200', className:'min-h-[50px]' },
      { time: '10:00am-11:00am', type: 'follow-up' as const, title: 'Follow-up', details: ['Patient:', 'LMN DOB:'], bgColorClass: 'bg-purple-100 hover:bg-purple-200', className:'min-h-[50px]' }, // Added from image hint
    ],
    friday12_col1: [ // For the MRI scans column on Friday
      { time: '7:00am-8:00am', type: 'scan' as const, title: 'Scan: MRI', details: ['Patient:', 'HDI DOB:', '02/17/1996'], bgColorClass: 'bg-blue-100 hover:bg-blue-200', className:'min-h-[50px]' },
      { time: '8:00am-9:00am', type: 'scan' as const, title: 'Scan: MRI', details: ['Patient:', 'AWA DOB:', '05/23/1909'], room:'#1', bgColorClass: 'bg-blue-100 hover:bg-blue-200', className:'min-h-[50px]' },
      { time: '9:00am-10:00am', type: 'scan' as const, title: 'Scan: MRI', details: ['Patient:', 'LPR DOB:', '08/17/1920'], bgColorClass: 'bg-blue-100 hover:bg-blue-200', className:'min-h-[50px]' },
      { time: '10:00am-11:00am', type: 'available' as const, title: 'Available', bgColorClass: 'bg-pink-100 hover:bg-pink-200', className:'min-h-[50px]' },
    ],
    friday12_col2: [ // For the Safety & Compliance Audit on Friday
      { time: '7:00am-10:00am', type: 'compliance' as const, title: 'Safety & Compliance Audi', bgColorClass: 'bg-yellow-100 hover:bg-yellow-200', className:'min-h-[150px]' }, // Spans multiple hours
      // Add empty slots or other logic if needed to fill the rest of this column visually.
      // For simplicity, this example makes the audit the only item in its dedicated visual column segment for Friday.
    ],
  };

  const resourceName = "Mitra Jones Pat Tessa...";

  return (
    <div className="p-2 md:p-4 bg-gray-200">
      <div className="bg-white shadow-lg border border-gray-300 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-300">
          {/* Day Columns */}
          <DayColumn dayName="Tuesday" date="9" resourceName={resourceName}>
            {scheduleEntries.tuesday9.map((entry, index) => (
              <ScheduleEntry key={`tue-${index}`} {...entry} />
            ))}
          </DayColumn>
          <DayColumn dayName="Wednesday" date="10" resourceName={resourceName}>
            {scheduleEntries.wednesday10.map((entry, index) => (
              <ScheduleEntry key={`wed-${index}`} {...entry} />
            ))}
          </DayColumn>
          <DayColumn dayName="Thursday" date="11" resourceName={resourceName}>
            {scheduleEntries.thursday11.map((entry, index) => (
              <ScheduleEntry key={`thu-${index}`} {...entry} />
            ))}
          </DayColumn>
          <DayColumn dayName="Friday" date="12" resourceName={resourceName}>
            {scheduleEntries.friday12_col1.map((entry, index) => (
              <ScheduleEntry key={`fri-c1-${index}`} {...entry} />
            ))}
          </DayColumn>
           {/* The image shows "Safety & Compliance Audit" potentially as a distinct column or area for Friday.
               Adding it as if it's another conceptual column for Friday for visual replication.
           */}
          <DayColumn dayName="Friday" date="12" resourceName="Compliance">
            {scheduleEntries.friday12_col2.map((entry, index) => (
              <ScheduleEntry key={`fri-c2-${index}`} {...entry} />
            ))}
          </DayColumn>
        </div>
      </div>
    </div>
  );
};

export default WeeklyScheduleView;

    