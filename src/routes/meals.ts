import { FastifyInstance } from "fastify";
import { z } from "zod";
import { knex } from "../database";
import {randomUUID} from 'node:crypto'
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";

export const mealsRoutes = async(app: FastifyInstance) => {
  app.post('/', {preHandler: [checkSessionIdExists]}, async(request, reply) => {
    const bodySchema = z.object({
      name: z.string(),
      description: z.string(),
      is_on_diet: z.boolean(),
      date: z.coerce.date()
    })

    const { name, description, is_on_diet, date} = bodySchema.parse(request.body)

    await knex('meals').insert({
      id: randomUUID(),
      name, 
      description,
      is_on_diet,
      date: date.getTime(),
      user_id: request.user?.id
    })

    return reply.code(201).send()
  })

  app.get('/', {preHandler: [checkSessionIdExists]},async(request) => {
    const meals = await knex('meals').where({user_id: request.user?.id}).orderBy('date', 'desc')

    return { meals }
  })

  app.get('/:id', {preHandler: [checkSessionIdExists]},async(request, reply) => {
    const requestSchema = z.object({ id: z.string().uuid() })

    const { id } = requestSchema.parse(request.params)

    const meal = await knex('meals').select().where({id}).first()

    if(!meal) {
      return reply.status(404).send({error: 'Meal not found'})
    }

    return reply.send({ meal })
  })

  app.put('/:id', {preHandler: [checkSessionIdExists]},async(request, reply) => {
    const requestSchema = z.object({ id: z.string().uuid() })

    const { id } =  requestSchema.parse(request.params)

    const bodySchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      is_on_diet: z.boolean(),
      date: z.coerce.date()
    })


    const { name, description, is_on_diet, date } = bodySchema.parse(request.body)

    const meal = await knex('meals').select().where({id}).first()

    if(!meal) {
      return reply.status(404).send({error: 'Meal not found'})
    }

    await knex('meals').update({
      name,
      description,
      is_on_diet,
      date: date.getTime()
    }).where({id})

    return reply.code(204).send()
  })

  app.delete('/:id', {preHandler: [checkSessionIdExists]},async(request, reply) => {
    const idSchema = z.object({ id: z.string().uuid() }) 

    const { id } = idSchema.parse(request.params)

    const meal = await knex('meals').select().where({id}).first()

    if(!meal) {
      return reply.status(404).send({error: 'Meal not found'})
    }

    await knex('meals').delete().where({id})

    return reply.code(204).send()
  })

  app.get('/metrics', {preHandler: [checkSessionIdExists]},async(request, reply) => {
    const totalMealsOnDiet = await knex('meals')
    .where({user_id: request.user?.id, is_on_diet: true})
    .count('id', {as: 'total'})
    .first()

    const totalMealsOffDiet = await knex('meals')
    .where({user_id: request.user?.id, is_on_diet: false})
    .count('id', {as: 'total'})
    .first()

    const totalMeals = await knex('meals')
    .where({user_id: request.user?.id })
    .orderBy('date', 'desc')

    const { bestOnDietSequence } = totalMeals.reduce((acc, meal) => {
      if(meal.is_on_diet) {
        acc.currentSequence += 1
      } else {
        acc.currentSequence = 0
      }

      if(acc.currentSequence > acc.bestOnDietSequence) {
        acc.bestOnDietSequence = acc.currentSequence
      }

      return acc

    }, {bestOnDietSequence: 0, currentSequence:0})

    return reply.send(({
      totalMeals: totalMeals.length,
      totalMealsOnDiet: totalMealsOnDiet?.total,
      totalMealsOffDiet: totalMealsOffDiet?.total,
      bestOnDietSequence
    }))
  })
}