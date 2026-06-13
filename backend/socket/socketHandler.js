// socket/socketHandler.js
const Queue   = require('../models/Queue');
const Booking = require('../models/Booking');
const Business = require('../models/Business');
const Message  = require('../models/Message');
const StaffNote = require('../models/StaffNote');
const { verifyToken } = require('../middleware/authMiddleware');
const { logger } = require('../config/logger');

// ── Socket authentication ──────────────────────────────────────
// Clients must send token in auth.token or cookie
const authenticateSocket = (socket) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie
      ?.split(';').find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
};

// Verify the socket belongs to an authenticated owner of the given salon.
// socket.user is attached (best-effort) by the io.use() middleware in server.js.
const isSocketSalonOwner = async (socket, salonId) => {
  try {
    const u = socket.user;
    if (!u || u.role !== 'owner' || !salonId) return false;
    const uid = u.id || u._id;
    if (!uid) return false;
    return !!(await Business.exists({ _id: salonId, $or: [{ ownerId: uid }, { owner: uid }] }));
  } catch {
    return false;
  }
};

// Per-socket event throttle (max 20 events / 5 seconds)
const createThrottle = () => {
  let count = 0;
  const reset = setInterval(() => { count = 0; }, 5000);
  return {
    check: () => { count++; return count <= 20; },
    clear: () => clearInterval(reset),
  };
};

// Helper: recalculate walk-in wait time and broadcast
const broadcastWaitTime = async (io, salonId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const queue = await Queue.findOne({ salonId, date: { $gte: today } }).lean();
    if (!queue) return;

    const activeItems = (queue.queue || []).filter(
      (item) => item.status === 'waiting' || item.status === 'in_progress'
    );
    const estimatedMinutes = activeItems.reduce((sum, item) => sum + (item.estimatedDuration || 30), 0);

    io.to(`queue-${salonId}`).emit('wait-time-updated', {
      salonId,
      estimatedMinutes,
      queueLength: activeItems.filter(i => i.status === 'waiting').length,
    });

    // Also emit to salon room (owner dashboard)
    io.to(`salon-${salonId}`).emit('wait-time-updated', {
      salonId,
      estimatedMinutes,
      queueLength: activeItems.filter(i => i.status === 'waiting').length,
    });
  } catch (err) {
    logger.warn('[Socket] broadcastWaitTime error', { error: err.message });
  }
};

module.exports = (socket, io) => {
  const throttle = createThrottle();
  socket.on('disconnect', () => throttle.clear());

  // Throttle guard for all events
  socket.use(([event], next) => {
    if (!throttle.check()) {
      return next(new Error('Rate limit exceeded'));
    }
    next();
  });
  // ===================================================
  // CUSTOMER JOINS PERSONAL ROOM (for direct notifications)
  // ===================================================
  socket.on('join-customer-room', (customerId) => {
    if (customerId) {
      socket.join(`customer-${customerId}`);
      console.log(`👤 Customer ${customerId} joined personal room`);
    }
  });

  // ===================================================
  // CUSTOMER JOINS QUEUE ROOM
  // ===================================================
  socket.on('join-queue', async (data) => {
    try {
      const { salonId, bookingId, customerId } = data;

      // Join room for this salon's queue
      const queueRoom = `queue-${salonId}`;
      socket.join(queueRoom);

      console.log(`👤 Customer ${customerId} joined queue room: ${queueRoom}`);

      // Send initial queue status
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const queue = await Queue.findOne({
        salonId,
        date: { $gte: today },
      });

      if (queue) {
        const queueItem = queue.queue.find(
          (item) => item.bookingId.toString() === bookingId
        );

        socket.emit('queue-status', {
          position: queueItem?.position || null,
          totalWaiting: queue.totalWaiting,
          averageWaitTime: queue.averageWaitTime,
          currentlyServing: queue.queue.find((item) => item.status === 'in_progress'),
        });
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      socket.emit('error', { message: 'Failed to join queue' });
    }
  });

  // ===================================================
  // OWNER JOINS SALON ROOM
  // ===================================================
  socket.on('join-salon', async (data) => {
    try {
      // Payload may be a string (salonId) or an object { salonId, ownerId }
      const salonId = typeof data === 'string' ? data : data?.salonId;
      if (!salonId) return;

      // Joining the broadcast room is harmless (read-only updates)
      socket.join(`salon-${salonId}`);

      // Only an authenticated owner of THIS salon may flip the online flag.
      // Prevents anyone from marking arbitrary salons online/offline.
      if (await isSocketSalonOwner(socket, salonId)) {
        socket.salonId = salonId; // track for offline-on-disconnect
        await Business.findByIdAndUpdate(salonId, {
          isOnline: true,
          lastOnlineAt: new Date(),
        });
        io.emit('salon-online', { salonId });
      }

      socket.emit('salon-connected', { message: 'Connected to salon room', salonId });
    } catch (error) {
      console.error('Error joining salon:', error);
      socket.emit('error', { message: 'Failed to join salon' });
    }
  });

  // ===================================================
  // OWNER DISCONNECT — mark salon offline
  // ===================================================
  socket.on('disconnect', async () => {
    try {
      if (socket.salonId) {
        await Business.findByIdAndUpdate(socket.salonId, { isOnline: false });
        // Broadcast to user frontend that this salon is now offline
        io.emit('salon-offline', { salonId: socket.salonId });
        console.log(`📴 Salon ${socket.salonId} marked OFFLINE (owner disconnected)`);
      }
    } catch (error) {
      console.error('Error marking salon offline:', error);
    }
  });

  // NOTE: The legacy inbound relay handlers (queue-updated, next-customer,
  // booking-status-changed, booking-confirmed, booking-cancelled,
  // payment-completed) were removed. No client emits them, and the backend
  // emits these notifications itself from the REST controllers. Keeping them
  // as inbound listeners allowed anyone to spoof customer notifications.

  // ===================================================
  // REAL-TIME QUEUE UPDATE (for owner dashboard)
  // ===================================================
  socket.on('request-queue-update', async (data) => {
    try {
      const { salonId } = data;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const queue = await Queue.findOne({
        salonId,
        date: { $gte: today },
      }).lean();

      socket.emit('queue-data', {
        salonId,
        queue: queue || null,
        timestamp: new Date().toISOString(),
      });

      console.log(`📊 Queue data sent for salon ${salonId}`);
    } catch (error) {
      console.error('Error fetching queue data:', error);
      socket.emit('error', { message: 'Failed to fetch queue data' });
    }
  });

  // NOTE: Legacy 'new-review' and 'send-notification' inbound relays removed —
  // they let any connected client broadcast arbitrary reviews/notifications.
  // Reviews and notifications are emitted server-side from REST controllers.

  // ===================================================
  // CHAT — JOIN BOOKING ROOM
  // ===================================================
  socket.on('join-chat', (data) => {
    try {
      const { bookingId } = data;
      if (bookingId) {
        socket.join(`chat-${bookingId}`);
        console.log(`💬 Socket joined chat room: chat-${bookingId}`);
      }
    } catch (error) {
      console.error('Error joining chat room:', error);
    }
  });

  // ===================================================
  // CHAT — SEND MESSAGE (real-time delivery via socket)
  // Persistence is handled by the REST POST route.
  // This event is for instant delivery to both parties.
  // ===================================================
  socket.on('chat-send', async (data) => {
    try {
      const { bookingId, senderRole, text, senderId } = data;
      if (!bookingId || !senderRole || !text?.trim()) return;

      const booking = await Booking.findById(bookingId).select('status customerId salonId').lean();
      if (!booking) return;
      if (['completed', 'cancelled'].includes(booking.status)) {
        socket.emit('chat-error', { message: 'Chat is closed for this booking' });
        return;
      }

      // Broadcast to the chat room (both parties see it instantly)
      io.to(`chat-${bookingId}`).emit('chat-message', {
        bookingId,
        message: {
          senderRole,
          text: text.trim(),
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      });

      console.log(`💬 Chat message in booking ${bookingId} from ${senderRole}`);
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  });

  // ===================================================
  // CHAT — LEAVE BOOKING ROOM
  // ===================================================
  socket.on('leave-chat', (data) => {
    try {
      const { bookingId } = data;
      if (bookingId) {
        socket.leave(`chat-${bookingId}`);
        console.log(`💬 Socket left chat room: chat-${bookingId}`);
      }
    } catch (error) {
      console.error('Error leaving chat room:', error);
    }
  });

  // ===================================================
  // CHAT — TYPING INDICATOR
  // ===================================================
  socket.on('chat-typing', (data) => {
    try {
      const { bookingId, senderRole } = data;
      if (bookingId && senderRole) {
        socket.to(`chat-${bookingId}`).emit('chat-typing', { bookingId, senderRole });
      }
    } catch (error) {
      console.error('Error broadcasting typing:', error);
    }
  });

  // ===================================================
  // LEAVE ROOM
  // ===================================================
  socket.on('leave-queue', (data) => {
    try {
      const { salonId } = data;
      const queueRoom = `queue-${salonId}`;
      socket.leave(queueRoom);
      console.log(`👤 Customer left queue room: ${queueRoom}`);
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  });

  socket.on('leave-salon', (data) => {
    try {
      const { salonId } = data;
      socket.leave(`salon-${salonId}`);
    } catch {}
  });

  // ===================================================
  // TEAM CHAT — JOIN STAFF CHANNEL
  // ===================================================
  socket.on('join-team-chat', async (data) => {
    try {
      const { salonId, token } = data;
      if (!salonId) return;
      const decoded = authenticateSocket(socket) || (token ? verifyToken(token) : null);
      if (!decoded) return socket.emit('error', { message: 'Authentication required for team chat' });

      socket.join(`team-${salonId}`);

      // Send last 50 messages
      const messages = await Message.find({ salonId, type: 'team' })
        .sort({ createdAt: -1 }).limit(50).lean();
      socket.emit('team-chat-history', messages.reverse());
    } catch (err) {
      logger.warn('[Socket] join-team-chat error', { error: err.message });
    }
  });

  // ===================================================
  // TEAM CHAT — SEND MESSAGE
  // ===================================================
  socket.on('team-chat-send', async (data) => {
    try {
      const { salonId, senderId, senderName, senderRole, text } = data;
      if (!salonId || !text?.trim()) return;

      const msg = await Message.create({
        salonId,
        type:       'team',
        senderId,
        senderName,
        senderRole: senderRole || 'owner',
        text:       text.trim().slice(0, 1000),
      });

      io.to(`team-${salonId}`).emit('team-chat-message', msg);
    } catch (err) {
      logger.warn('[Socket] team-chat-send error', { error: err.message });
    }
  });

  // ===================================================
  // WAIT TIME — REQUEST CURRENT ESTIMATE
  // ===================================================
  socket.on('get-wait-time', async (data) => {
    try {
      const { salonId } = data;
      if (salonId) await broadcastWaitTime(io, salonId);
    } catch {}
  });

  // ===================================================
  // STAFF NOTES — GET/ADD ON BOOKING
  // ===================================================
  socket.on('get-staff-notes', async (data) => {
    try {
      const { bookingId } = data;
      if (!bookingId) return;
      const notes = await StaffNote.find({ bookingId }).sort({ createdAt: -1 }).lean();
      socket.emit('staff-notes', { bookingId, notes });
    } catch {}
  });

  socket.on('add-staff-note', async (data) => {
    try {
      const { bookingId, salonId, authorId, authorName, authorRole, content } = data;
      if (!bookingId || !content?.trim()) return;
      const note = await StaffNote.create({ bookingId, salonId, authorId, authorName, authorRole: authorRole || 'owner', content: content.trim() });
      io.to(`salon-${salonId}`).emit('new-staff-note', { bookingId, note });
    } catch {}
  });
};

// Export broadcastWaitTime so booking controllers can call it after status changes
module.exports.broadcastWaitTime = broadcastWaitTime;
