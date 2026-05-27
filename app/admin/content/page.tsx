import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import ContentStagingForm from './content-form'

export const metadata = {
  title: 'Content Staging — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export default async function AdminContentPage() {
  const session = await getServerSession(auth)

  if (!session) {
    redirect('/admin/login')
  }

  return <ContentStagingForm />
}
