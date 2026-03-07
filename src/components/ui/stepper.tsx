'use client';

import * as React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  activeStep: number;
}

const StepperContext = React.createContext<{
  orientation: 'horizontal' | 'vertical';
  activeStep: number;
  stepCount: number;
  children?: React.ReactNode;
}>({
  orientation: 'vertical',
  activeStep: 0,
  stepCount: 0,
});

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ orientation = 'vertical', activeStep, children, className, ...props }, ref) => {
    const stepCount = React.Children.count(children);
    const contextValue = { orientation, activeStep, stepCount, children };

    return (
      <StepperContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(
            'flex',
            orientation === 'horizontal' && 'w-full items-center',
            orientation === 'vertical' && 'flex-col',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </StepperContext.Provider>
    );
  }
);
Stepper.displayName = 'Stepper';

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  isCompleted?: boolean;
}

const Step = React.forwardRef<HTMLDivElement, StepProps>(({ label, ...props }, ref) => {
  const { orientation, activeStep, children } = React.useContext(StepperContext);
  
  const childrenArray = React.Children.toArray(children);
  const stepIndex = childrenArray.findIndex(child => (child as React.ReactElement).props.label === label);


  const isActive = stepIndex === activeStep;
  const isCompleted = stepIndex < activeStep;

  return (
    <div
      ref={ref}
      className={cn('flex items-center gap-3', orientation === 'vertical' && 'pb-8 relative')}
      {...props}
    >
      <div
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors duration-300',
          isActive && 'border-primary bg-primary/10 text-primary',
          isCompleted && 'border-green-500 bg-green-500 text-white',
          !isActive && !isCompleted && 'border-muted-foreground text-muted-foreground'
        )}
      >
        {isCompleted ? <Check size={14} /> : stepIndex + 1}
      </div>
      <span
        className={cn(
          'text-sm transition-colors duration-300',
          isActive && 'font-semibold text-primary',
          isCompleted && 'text-foreground',
          !isActive && !isCompleted && 'text-muted-foreground'
        )}
      >
        {label}
      </span>
      {orientation === 'vertical' && stepIndex < childrenArray.length -1 && (
        <div className="absolute left-3 top-8 h-full w-px bg-border" />
      )}
    </div>
  );
});
Step.displayName = 'Step';

export { Stepper, Step };
