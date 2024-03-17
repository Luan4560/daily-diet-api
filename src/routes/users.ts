import { knex } from '../database'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'

export const userRoutes = async(app: FastifyInstance) => {
  
  app.post('/', async (request, reply) => {
     const createUserSchema = z.object({
      name: z.string().min(3).max(32),
      email: z.string().email()
     })

     let sessionId = request.cookies.sessionId

     if(!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      })
     }

    const { name, email,  } = createUserSchema.parse(request.body)

    const userByEmail = await knex('users').where({email}).first()

    if(userByEmail) {
      return reply.status(400).send({message: 'User already exists'})
    }
    
     await knex('users').insert({
      id: randomUUID(),
      name,
      email,
      session_id: sessionId
    })

    return reply.code(201).send()
  })
  
  app.get('/', async () => {
    const user = await knex('users').select('*')
  
    return user
  })

  app.get('/:id', async (request) => {

    const  requestSchema = z.object({ id: z.string() })
    const { id } = requestSchema.parse(request.params)

    const userById = await knex('users')
    .select()
    .where({id: id})
    
   return userById
  })
}

