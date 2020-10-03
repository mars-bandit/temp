import { Transform, Quat, Vec3 } from "../../fungi/maths/Maths.js";
import App from "../../fungi/App.js";

class SwingTwistSolver{
	static apply_chain( ik, chain, tpose, pose, p_wt ){
		let rot	= Quat.mul( p_wt.rot, tpose.get_local_rot( chain.first() ) ), // Get WS Rotation of First Bone
			q	= new Quat(),
			dir	= new Vec3();

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Swing
		dir.from_quat( rot, chain.effector_dir );	// Get WS Effector Direction of the Chain
		q.from_unit_vecs( dir, ik.axis.z );			// Rotation TO IK Effector Direction
		rot.pmul( q ); 								// Apply to Bone WS Rot

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Twist
		dir.from_quat( rot, chain.pole_dir );		// Get WS Pole Direction of Chain
		q.from_unit_vecs( dir, ik.axis.y );			// Rotation to IK Pole Direction
		rot.pmul( q );								// Apply to Bone WS Rot + Swing

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		rot.pmul_invert( p_wt.rot );				// To Local Space
		pose.set_local_rot( chain.bones[0].idx, rot );
	}
}


function apply_look_twist( rig, b_info, ik ){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	let bind 	= rig.tpose.bones[ b_info.idx ],
		pose 	= rig.pose.bones[ b_info.idx ];

	// Get the bone's parent World Space Rotation.
	// Then compute the Bone's WS rotation as if its local rot
	// has not change from the initial rotation of the tpose.
	let p_rot 	= rig.pose.get_parent_rot( b_info.idx );
	let c_rot 	= Quat.mul( p_rot, bind.local.rot );
	
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Using Bone's WS Rotation, compute its Alt Forward Direction
	let now_look_dir = Vec3.transform_quat( b_info.alt_fwd, c_rot );

	// Now compute the swing rotation and apply
	// it to our bone's current WS rotation
	let rot = Quat
		.unit_vecs( now_look_dir, ik.look_dir )	// Create our Swing Rotation
		.mul( c_rot );							// Then Apply to our foot
	
	// Next we compute the current Alt Up direction from the bones
	// swing modified WS rotation. Use this direction with the IK
	// direction to create a Twist Rotation that we then apply to our bones rotation.
	let now_twist_dir	= Vec3.transform_quat( b_info.alt_up, rot );
	let twist 			= Quat.unit_vecs( now_twist_dir, ik.twist_dir  );
	rot.pmul( twist );	// Apply Twist

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	rot.pmul_invert( p_rot );					// To Local Space
	rig.pose.set_local_rot( b_info.idx, rot );	// Save to pose.		
}


function aim( chain, tpose, pose, p_wt ){
	let rot = new Quat();
	this._aim_bone2( chain, tpose, p_wt, rot );

	rot.pmul_invert( p_wt.rot ); // Convert to Bone's Local Space by mul invert of parent bone rotation
	pose.set_bone( chain.bones[ 0 ].idx, rot );
}

function _aim_bone( chain, tpose, p_wt, out ){
	let alt_fwd	= chain.alt_dir[ 0 ].fwd,
		alt_up	= chain.alt_dir[ 0 ].up,
		rot		= Quat.mul( p_wt.rot, tpose.get_local_rot( chain.first() ) ),	// Get World Space Rotation for Bone
		dir		= Vec3.transform_quat( alt_fwd, rot );					// Get Bone's WS Forward Dir

	//let ct = new Transform();
	//let b = tpose.bones[ chain.first() ];
	//ct.from_add( p_wt, b.local );
	//App.Debug.pnt( ct.pos, "white", 0.03 );
	//App.Debug.ln( ct.pos, Vec3.add( ct.pos, f_dir), "orange" );

	//Swing
	let q = Quat.unit_vecs( dir, this.axis.z );
	out.from_mul( q, rot );

	// Twist 
	//let u_dir	= Vec3.transform_quat( chain.alt_up, out );
	//let twist 	= Vec3.angle( u_dir, this.axis.y );
	//App.Debug.ln( ct.pos, Vec3.add( ct.pos, u_dir), "white" );

	dir.from_quat( out, alt_up );					// After Swing, Whats the UP Direction
	let twist 	= Vec3.angle( dir, this.axis.y );	// Get difference between Swing Up and Target Up

	if( twist <= 0.00017453292 ) twist = 0;
	else{
		//let l_dir  	= Vec3.cross( dir, this.axis.z );
		dir.from_cross( dir, this.axis.z );	// Get Swing LEFT, used to test if twist is on the negative side.
		//App.Debug.ln( ct.pos, Vec3.add( ct.pos, l_dir), "black" );

		if( Vec3.dot( dir, this.axis.y ) >= 0 ) twist = -twist; 
	}

	out.pmul_axis_angle( this.axis.z, twist );	// Apply Twist

	//if( Quat.dot( out, rot ) < 0 ) out.negate();	

	//console.log( Quat.dot( rot, out ) );

/*

q.from_unit_vecs( Vec3.FORWARD, p_fwd )			// Rotation Difference From True FWD and Pose FWD, Swing Rotation
.mul( tb.world.rot );						// Apply Swing to TPose WS Rotation, gives Swing in WS

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
let s_up	= Vec3.transform_quat( t_up, q ),	// Get UP Direction of the Swing Rotation
twist	= Vec3.angle( s_up, p_up );			// Swing+Pose have same Fwd, Use Angle between both UPs for twist

if( twist <= (0.01 * Math.PI / 180) ){
twist = 0; // If Less the .01 Degree, dont bother twisting.
}else{
// Swing FWD and Pose FWD Should be the same in ws, So no need to calc it,
// So using Pose Fwd and Swing up to get Swing left
// Is the Angle going to be Negative?, use Swing Left to determine if 
// its in the left or right side of UP
let s_lft = Vec3.cross( s_up, p_fwd ).norm();
if( Vec3.dot( s_lft, p_up ) >= 0 )	twist = -twist; 
}

*/
	
}

export default SwingTwistSolver;