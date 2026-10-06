import RoadmapHome from '@/components/RoadmapHome';
import { getRoadmap } from '@/lib/content';

export default function Home() {
  return <RoadmapHome stages={getRoadmap()} />;
}
