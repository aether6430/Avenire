import { motion } from 'motion/react';
import { useUserStore } from '../../stores/userStore';

export const Overview = () => {
  const { user } = useUserStore()

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-grad">Hey there, {user?.name}!</h1>
      </div>
    </motion.div>
  );
};
