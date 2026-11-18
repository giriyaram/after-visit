'use client';

import {useRouter} from 'next/navigation';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';

type Props = {
  value: 'all' | 'flagged';
};

/** All open follow-ups, or only the ones flagged for the doctor. */
export function InboxFilter({value}: Props) {
  const router = useRouter();
  return (
    <SegmentedControl
      label="Show"
      size="sm"
      value={value}
      onChange={next => router.push(next === 'flagged' ? '/inbox?flagged=1' : '/inbox')}>
      <SegmentedControlItem value="all" label="All open" />
      <SegmentedControlItem value="flagged" label="Flagged for doctor" />
    </SegmentedControl>
  );
}
