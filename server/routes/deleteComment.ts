import { Request, Response, NextFunction } from 'express';
import { factory, formatFilename } from '../../shared/logging';

const log = factory.getLogger(formatFilename(__filename));

export const Errors = {
  NotLoggedIn: 'Not logged in',
  NoCommentId: 'Must provide comment_id',
  AddressNotOwned: 'Not owned by this user',
};

const deleteComment = async (models, req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new Error(Errors.NotLoggedIn));
  }
  if (!req.body.comment_id) {
    return next(new Error(Errors.NoCommentId));
  }

  try {
    const userOwnedAddresses = await req.user.getAddresses();
    const comment = await models.OffchainComment.findOne({
      where: { id: req.body.comment_id, },
      include: [ models.Address ],
    });
    if (userOwnedAddresses.filter((addr) => !!addr.verified).map((addr) => addr.id).indexOf(comment.address_id) === -1) {
      return next(new Error(Errors.AddressNotOwned));
    }
    // actually delete
    await comment.destroy();
    return res.json({ status: 'Success' });
  } catch (e) {
    return next(e);
  }
};

export default deleteComment;
