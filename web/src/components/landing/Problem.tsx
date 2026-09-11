"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/landing/Eyebrow";

export function Problem() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 border-t border-border">
      <div className="grid lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
        <SectionHeading
          eyebrow="The problem"
          title={'Nobody disagrees on "will BTC go up?"'}
          subtitle="That's a question about market direction, not opinion — almost everyone answers it the same way. With no one on the other side, DreamDEX's own up/down markets never fill. Most never see a single trade."
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="corner-panel-sm shrink-0 border border-border bg-surface px-8 py-6 text-center lg:min-w-[220px]"
        >
          <div className="font-display text-6xl text-draw tabular leading-none">83.5%</div>
          <div className="mt-2 text-sm text-text-dim leading-relaxed">
            of DreamDEX markets
            <br />
            never traded
          </div>
        </motion.div>
      </div>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mt-10 font-display text-2xl sm:text-3xl"
      >
        <span className="text-btc">BTC</span> vs <span className="text-eth">ETH</span> works
        because people already have a side.
      </motion.p>
    </section>
  );
}
