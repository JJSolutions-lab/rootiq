import * as React from 'react';
import { cn } from '@/lib/utils';
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_14px_rgba(17,32,46,.035)]', className)} {...props} /> }
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex items-start justify-between p-5 pb-3', className)} {...props} /> }
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('p-5 pt-2', className)} {...props} /> }
