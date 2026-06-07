import { DoctorDetail } from "@/components/doctors/doctor-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DoctorDetail id={id} backHref="/director/doctors" />;
}
