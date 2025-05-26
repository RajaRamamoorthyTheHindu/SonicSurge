import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          "transition-colors duration-150 ease-in-out", // Added transition
          "apple-input", // Added class for potential global overrides
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
