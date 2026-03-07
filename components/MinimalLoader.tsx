import React from 'react';
import { motion } from 'framer-motion';

export const MinimalLoader = ({ size = 48, className = '' }: { size?: number, className?: string }) => {
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <motion.svg
                width={size}
                height={size}
                viewBox="0 0 50 50"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
                <motion.circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0.1, pathOffset: 0 }}
                    animate={{
                        pathLength: [0.1, 0.8, 0.1],
                        pathOffset: [0, 0, 1]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        times: [0, 0.5, 1]
                    }}
                />
            </motion.svg>
        </div>
    );
};
