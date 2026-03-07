import React from 'react';
import { motion } from 'framer-motion';

/**
 * ModernLoader
 * Style: Abstract geometric, claymorphism, hypnotic spiral
 * Background: Charcoal
 * Elements: White staggered circles with varying opacity
 */
export const ModernLoader: React.FC<{ size?: number; className?: string }> = ({ size = 120, className }) => {
    const circleStyle = {
        boxShadow: 'inset 4px 4px 10px rgba(0,0,0,0.15), inset -4px -4px 10px rgba(255,255,255,0.4), 8px 8px 16px rgba(0,0,0,0.15)',
        background: '#f0f0f3'
    };

    return (
        <div className={`flex items-center justify-center ${className || 'w-full h-full bg-[#1a1a1a]'}`}>
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: `${100 - i * 25}%`,
                            height: `${100 - i * 25}%`,
                            border: '12px solid rgba(255,255,255,0.9)',
                            borderTopColor: 'transparent',
                            borderLeftColor: 'transparent',
                            borderRadius: '50%',
                            opacity: 0.8 - i * 0.2, // Staggered opacity
                            filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.2))', // Soft shadow
                        }}
                        animate={{
                            rotate: 360,
                            scale: [1, 1.05, 1], // Breathing effect
                        }}
                        transition={{
                            rotate: {
                                duration: 2 + i * 0.5, // Staggered speed
                                ease: "linear",
                                repeat: Infinity
                            },
                            scale: {
                                duration: 2,
                                ease: "easeInOut",
                                repeat: Infinity,
                                delay: i * 0.2
                            }
                        }}
                    >
                        {/* Inner claymorphism detail - simplified as border style is dominant for spirals */}
                    </motion.div>
                ))}

                {/* Center Core */}
                <motion.div
                    className="absolute bg-white rounded-full"
                    style={{
                        width: '15%',
                        height: '15%',
                        boxShadow: '0 0 20px rgba(255,255,255,0.5), inset 2px 2px 5px rgba(0,0,0,0.1)'
                    }}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            </div>
        </div>
    );
};
