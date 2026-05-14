import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { ADMINS_DB } from '../../routes/!!privileged/admins.js';
import { APIListUserNotes, APINotesResponse, Note } from '@jzpanel/common/Note';
import SteamID from 'steamid';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.get('/', async (req: FastifyRequest<{
    Querystring: {
      limit?: number, page?: number, search_content?: string, search_user?: string
    }
  }>, reply): Promise<APINotesResponse> => {
    let page = Number(req.query.page)
    if (!page || page < 0) page = 1

    let limit = Number(req.query.limit)
    if (!limit || limit < 1) limit = 100

    const offset = (page - 1) * limit;


    const queryConditions: string[] = []
    const queryData: string[] = []
    for (const param in req.query) {
      let [key, column] = param.split("_")
      if (key === "search" && req.query[param] != "") {
        if (column == "user") column = 'u.last_name'
        queryConditions.push(`${column} LIKE ?`)
        queryData.push(`%${req.query[param]}%`)
      }
    }
    let whereCondition = ""
    let whereCount = null
    if (queryConditions.length > 0) {
      whereCondition = `WHERE ${queryConditions.join(' AND ')}`
      const [notesCount] = await fastify.db.execute<RowDataPacket[]>(`
                SELECT COUNT(*) as count FROM notes
                LEFT JOIN view_panel_user as u ON SUBSTRING(notes.steamid, 11) = u.account_id
                ${whereCondition}`,
        queryData
      )
      whereCount = notesCount[0].count
    }
    const [notes] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT notes.id, notes.steamid, notes.createdAt, notes.markedBy, notes.content, u.last_name as user, e.last_name as executor, !b.expired as banned,
            (SELECT COUNT(*) FROM ${ADMINS_DB}.sm_admins WHERE ${ADMINS_DB}.sm_admins.identity = notes.steamid) as targetIsAdmin
            FROM notes
            LEFT JOIN view_panel_user u ON SUBSTRING(notes.steamid, 11) = u.account_id
            LEFT JOIN view_panel_user e ON SUBSTRING(notes.markedBy, 11) = e.account_id
            LEFT JOIN bans as b ON notes.steamid = b.steamid
            ${whereCondition}
            ORDER BY notes.id DESC LIMIT ?, ?`,
      [...queryData, offset, limit]
    )

    const missingNameQueue = new Set<SteamID>()
    for (const note of notes) {
      if (!note.user) {
        missingNameQueue.add(new SteamID(note.steamid))
      }
      if (!note.executor) {
        missingNameQueue.add(new SteamID(note.markedBy))
      }
    }
    // Lazy but just fetch them for the next request
    if (missingNameQueue.size > 0) {
      await fastify.users.fetchUsers([...missingNameQueue.values()])
    }

    const [notesCount] = await fastify.db.execute<RowDataPacket[]>(`SELECT COUNT(*) as count FROM notes`)

    return {
      totalNotes: notesCount[0].count,
      notesCount: whereCount ?? notesCount[0].count,
      notes: notes.map(note => {
        return formatNote(note)
      })
    }
  })

  fastify.get('/user/:steamid', async (req: FastifyRequest<{ Params: { steamid: string } }>, reply) => {
    const [notes] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT notes.*, u.last_name as user, e.last_name as executor, !b.expired as banned
            FROM notes
            LEFT JOIN view_panel_user as u ON SUBSTRING(notes.steamid, 11) = u.account_id
            LEFT JOIN view_panel_user as e ON SUBSTRING(notes.markedBy, 11) = e.account_id
            LEFT JOIN bans as b ON notes.steamid = b.steamid
            WHERE SUBSTRING(notes.steamid, 11) = SUBSTRING(?, 11)
            ORDER BY notes.id DESC`,
      [req.params.steamid]
    )

    return reply.send({
      notes: notes.map(note => {
        return formatNote(note)
      })
    })
  })

  fastify.get('/admins/:steamid', async (req: FastifyRequest<{ Params: { steamid: string } }>, reply): Promise<APIListUserNotes> => {
    const [notes] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT notes.*, u.last_name as user, e.last_name as executor, !b.expired as banned
            FROM notes
            LEFT JOIN view_panel_user as u ON SUBSTRING(notes.steamid, 11) = u.account_id
            LEFT JOIN view_panel_user as e ON SUBSTRING(notes.markedBy, 11) = e.account_id
            LEFT JOIN bans as b ON notes.steamid = b.steamid
            WHERE notes.markedBy = ?
            ORDER BY notes.id DESC`,
      [req.params.steamid]
    )

    return {
      notes: notes.map(note => {
        return formatNote(note)
      })
    }
  })

  fastify.route({
    url: '/:id',
    method: 'GET',
    schema: {
      params: {
        type: "object",
        properties: {
          id: {
            type: 'number'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            note: { type: ['object', 'null'] }
          }
        }
      }
    },
    async handler(req: FastifyRequest<{
      Params: { id: number }
    }>, reply) {
      const [notes] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT notes.*, u.last_name as user, e.last_name as executor, !b.expired as banned
                FROM notes
                LEFT JOIN view_panel_user as u ON SUBSTRING(notes.steamid, 11) = u.account_id
                LEFT JOIN view_panel_user as e ON SUBSTRING(notes.markedBy, 11) = e.account_id
                LEFT JOIN bans as b ON notes.steamid = b.steamid
                WHERE id = ?
                ORDER BY notes.id DESC`,
        [req.params.id]
      )

      return {
        note: notes.length > 0 ? formatNote(notes[0]) : null
      }
    }
  })

  function formatNote(note: any): Note {
    let action = undefined
    if (note.content.startsWith("@") && note.content.length > 1) {
      action = note.content.slice(1).split(".")
    }
    return {
      id: note.id,
      content: note.content,
      client: {
        id: note.steamid,
        name: note.user,
        isAdmin: note.targetIsAdmin == 1
      },
      markedBy: {
        id: note.markedBy,
        name: note.executor,
      },
      createdAt: note.createdAt,
      banned: note.banned == 1,
      action
    }
  }
}
