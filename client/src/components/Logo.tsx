import { motion } from "framer-motion";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  textWeight?: 'normal' | 'medium' | 'semibold';
}

export default function Logo({ 
  size = 'md', 
  className = '', 
  textWeight = 'semibold'
}: LogoProps) {
  const sizeConfigs = {
    sm: { container: 'w-12 h-12', font: '36px', text: 'text-lg' },
    md: { container: 'w-16 h-16', font: '48px', text: 'text-2xl' },
    lg: { container: 'w-28 h-28', font: '84px', text: 'text-3xl' },
    xl: { container: 'w-32 h-32', font: '96px', text: 'text-4xl' }
  };

  const config = sizeConfigs[size];

  const weights = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative ${config.container} flex items-center justify-center`}>
        {/* 外圈光环 - 反向旋转 */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, 
              transparent, 
              rgba(255, 215, 0, 0.3) 10%, 
              rgba(255, 215, 0, 0.7) 20%, 
              rgba(218, 165, 32, 0.9) 30%, 
              transparent 40%, 
              transparent 60%, 
              rgba(255, 215, 0, 0.3) 70%, 
              rgba(255, 215, 0, 0.7) 80%, 
              rgba(218, 165, 32, 0.9) 90%, 
              transparent 100%)`,
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)'
          }}
          animate={{ rotate: -360 }}
          transition={{
            repeat: Infinity,
            duration: 15,
            ease: "linear",
          }}
        />
        
        {/* 内圈 - 脉动 */}
        <motion.div
          className="absolute rounded-full border border-primary/50"
          style={{
            width: '80%',
            height: '80%',
            boxShadow: '0 0 10px rgba(255, 215, 0, 0.4), inset 0 0 10px rgba(255, 215, 0, 0.2)'
          }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: "easeInOut",
          }}
        />

        {/* 七字 - 旋转 */}
        <motion.div
          className="absolute font-bold"
          style={{
            fontSize: config.font,
            fontFamily: "'KaiTi', 'STKaiti', 'SimSun', serif",
            background: 'linear-gradient(45deg, #ffd700, #ffed4e, #ffd700, #daa520)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
          }}
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: "linear",
          }}
        >
          七
        </motion.div>

        {/* 发光效果 */}
        <div 
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '120%',
            height: '120%',
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%)',
            filter: 'blur(10px)'
          }}
        />
      </div>
      
      <span className={`${config.text} ${weights[textWeight]} text-foreground`}>
        动<span className="text-primary font-medium">「QI」</span>来
      </span>
    </div>
  );
}
