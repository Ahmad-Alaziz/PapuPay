import { AnimatePresence, motion } from "motion/react";
import { Check, Plus } from "lucide-react";

export default function AddGlyph({
  added,
  size = 19,
}: {
  added: boolean;
  size?: number;
}) {
  return (
    <span className="add-glyph" aria-hidden="true">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={String(added)}
          initial={{ opacity: 0, scale: 0.6, rotate: added ? -25 : 25 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.12 }}
        >
          {added ? <Check size={size} /> : <Plus size={size} />}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
