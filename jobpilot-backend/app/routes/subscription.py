from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Subscription
from app import db
import stripe
import os
import logging

bp = Blueprint('subscription', __name__, url_prefix='/api/subscription')
logger = logging.getLogger(__name__)

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Precios de Stripe (Reemplazar con IDs reales de tu cuenta)
PRICES = {
    'pro': 'price_pro_monthly',      # $9.990 CLP
    'premium': 'price_premium_monthly'  # $19.990 CLP
}

@bp.route('/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    """Obtiene estado de suscripción del usuario"""
    try:
        user_id = int(get_jwt_identity())
        subscription = Subscription.query.filter_by(user_id=user_id).first()
        
        if not subscription:
            return jsonify({'error': 'Subscription not found'}), 404
        
        return jsonify({
            'success': True,
            'subscription': subscription.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Get subscription status error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/upgrade', methods=['POST'])
@jwt_required()
def upgrade_plan():
    """Crea sesión de Stripe para upgrade"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        tier = data.get('tier')  # 'pro' o 'premium'
        
        if tier not in ['pro', 'premium']:
            return jsonify({'error': 'Invalid tier'}), 400
        
        if user.tier != 'free':
            return jsonify({'error': 'Already subscribed'}), 400
        
        # Obtener o crear customer Stripe
        subscription = Subscription.query.filter_by(user_id=user_id).first()
        
        if subscription.stripe_customer_id:
            customer_id = subscription.stripe_customer_id
        else:
            # Crear customer
            customer = stripe.Customer.create(
                email=user.email,
                name=user.name,
                metadata={'user_id': user_id}
            )
            customer_id = customer.id
            subscription.stripe_customer_id = customer_id
            db.session.commit()
        
        # Crear sesión de checkout
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[
                {
                    'price': PRICES[tier],
                    'quantity': 1
                }
            ],
            mode='subscription',
            success_url=f"{os.getenv('FRONTEND_URL')}/dashboard?upgrade=success",
            cancel_url=f"{os.getenv('FRONTEND_URL')}/dashboard?upgrade=cancelled",
            metadata={'user_id': user_id, 'tier': tier}
        )
        
        return jsonify({
            'success': True,
            'checkout_url': session.url
        }), 200
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        return jsonify({'error': 'Payment error'}), 500
    except Exception as e:
        logger.error(f"Upgrade error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Webhook de Stripe para eventos de suscripción"""
    try:
        payload = request.get_data()
        sig_header = request.headers.get('Stripe-Signature')
        
        try:
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                os.getenv('STRIPE_WEBHOOK_SECRET')
            )
        except ValueError:
            return jsonify({'error': 'Invalid payload'}), 400
        except stripe.error.SignatureVerificationError:
            return jsonify({'error': 'Invalid signature'}), 400
        
        # Manejar eventos
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            user_id = session['metadata']['user_id']
            tier = session['metadata']['tier']
            
            subscription = Subscription.query.filter_by(user_id=user_id).first()
            subscription.tier = tier
            subscription.status = 'active'
            subscription.stripe_subscription_id = session['subscription']
            
            user = User.query.get(user_id)
            user.tier = tier
            
            db.session.commit()
            logger.info(f"User {user_id} upgraded to {tier}")
        
        elif event['type'] == 'customer.subscription.deleted':
            subscription_obj = event['data']['object']
            customer_id = subscription_obj['customer']
            
            subscription = Subscription.query.filter_by(stripe_customer_id=customer_id).first()
            if subscription:
                subscription.tier = 'free'
                subscription.status = 'cancelled'
                
                user = User.query.get(subscription.user_id)
                user.tier = 'free'
                
                db.session.commit()
                logger.info(f"User {subscription.user_id} cancelled subscription")
        
        return jsonify({'received': True}), 200
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return jsonify({'error': 'Webhook error'}), 500
