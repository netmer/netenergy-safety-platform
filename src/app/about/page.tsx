
import { Metadata } from 'next';
import AboutClientPage from './about-client-page';

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา | NetEnergy Safety Platform',
  description: 'เราคือผู้นำด้านการให้บริการอบรมความปลอดภัยครบวงจร ด้วยความมุ่งมั่นที่จะยกระดับมาตรฐานความปลอดภัยในสถานประกอบการของประเทศไทย',
};

export default function AboutPage() {
  return <AboutClientPage />;
}
