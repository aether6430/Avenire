import { auth } from '@avenire/auth/server';
import { getChatsByUserId } from '@avenire/database/queries';

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers
  });

  if (!session || !session.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  const chats = await getChatsByUserId({ id: session.user.id! });
  return Response.json(chats);
}