import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { NOT_FOUND } from "../../../responses.js";
import { ChildWorkshopItem, WorkshopItem } from "@srcpanel/common/Share";

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.post(':/shareId/addons/workshop/:publishedfileid/download', 
    async (req: FastifyRequest<{ 
      Params: { shareId: string, publishedfileid: string },
      Querystring: { destinations: string, children?: string }
    }>, reply) => {
      const share = fastify.servers.getShare(req.params.shareId)
      if(!share) return NOT_FOUND(reply, "SHARE_NOT_FOUND", "No share found with id")
      if(!share.sources.steam_workshop) return reply.send({
        error: "SOURCE_UNSUPPORTED",
        message: "Steam workshop support is not enabled for this share"
      })

      const destinations: string[]|undefined = req.query.destinations?.split(",")
      
      // Check if the item is a collection and either resolve the children or download them all
      const children = await fastify.steam.getCollectionChildren(req.params.publishedfileid)
      const details = await fastify.steam.getItemDetails([req.params.publishedfileid])
      share.workshopDLQueue.downloadItems(details, destinations)


      // Check if a collection, if so grab the children too 
      if(children) {
        const selectedChildrenIds = req.query.children?.split(",")
        const childrenItems = (await fastify.steam.getItemDetails(children))
          // Filter out unselected children addons
          .filter(child => !selectedChildrenIds || selectedChildrenIds.includes(child.publishedfileid))
          // Convert it to ChildWorkshopItem to keep track of collection its in
          .map<ChildWorkshopItem>(item => {
            return {
              collection: {
                id: req.params.publishedfileid,
                name: details[0].title
              },
              ...item
            }
          })
        share.workshopDLQueue.downloadItems(childrenItems, destinations)
      }

      return reply.status(204).send()
    }
  )
}