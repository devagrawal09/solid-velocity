import { redirect } from '@solidjs/router';
import { assertRequestAuth } from '~/auth';
import { db } from '~/db/drizzle';
import { mkConfig, generateCsv, asString } from 'export-to-csv';

// Get all connections of this user
export async function GET() {
  const { userId } = assertRequestAuth();
  let profile = await db.query.attendeeProfiles.findFirst({
    where: (attendee, { eq }) => eq(attendee.userId, userId)
  });

  if (!profile) {
    return redirect('/attendee');
  }

  const connections = await db.query.connectionTable.findMany({
    where: (connection, { eq, or }) =>
      or(eq(connection.from, profile.id), eq(connection.to, profile.id)),
    with: {
      connectionReceiver: true,
      connectionInitiator: true
    }
  });

  // Aggregate the connections to only collect info of the other profile
  const aggregatedConnections = connections.map(connection => {
    const isInitiator = connection.connectionInitiator.id === profile.id;
    const otherProfile = isInitiator
      ? connection.connectionReceiver
      : connection.connectionInitiator;
    const { id, userId, ...otherProfileWithoutIds } = otherProfile;
    // Add field "scannedBy"
    const toReturn = { ...otherProfileWithoutIds, scannedBy: isInitiator ? 'me' : 'them' };
    return toReturn;
  });

  const csvConfig = mkConfig({
    columnHeaders: [
      'name',
      'avatarUrl',
      'email',
      'twitter',
      'linkedin',
      'github',
      'job',
      'company',
      'scannedBy'
    ]
  });

  const csv = generateCsv(csvConfig)(aggregatedConnections);
  return new Response(asString(csv), { status: 200 });
}
